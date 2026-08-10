import type { TSESTree } from '@typescript-eslint/utils'
import { TSESLint } from '@typescript-eslint/utils'
import { getTsconfigWithContext } from 'eslint-import-context'

import type {
  ChildContext,
  ExportDefaultSpecifier,
  ExportNamespaceSpecifier,
  ParseError,
} from '../types.js'
import { getValue } from '../utils/get-value.js'
import { lazy } from '../utils/lazy-value.js'
import { parse } from '../utils/parse.js'
import { recursivePatternCapture } from '../utils/recursive-pattern-capture.js'
import { relative } from '../utils/resolve.js'
import { isUnambiguousModule } from '../utils/unambiguous.js'
import { visit } from '../utils/visit.js'

import type { DocCommentBlock } from './module-doc.js'
import { captureDoc, parseComment } from './module-doc.js'
import type { ModuleImportDeclaration } from './module-info.js'
import type { DefaultExportSourceName } from './module-lexer.js'

/**
 * @file The AST-based module analysis — the fallback for what the lexers
 *   can't parse (TS/TSX/Flow, custom parsers, rejected files). The file is
 *   parsed with the configured ESLint parser and its AST walked once by
 *   {@link analyzeAstModule}, which dispatches each top-level statement to a
 *   named handler below. The output is plain {@link AstModuleFacts} — the
 *   same shape the lexer route produces — plus lazy doc-comment closures,
 *   the one thing only this route can provide.
 */

export type { DefaultExportSourceName } from './module-lexer.js'

/** One name exported by the module's own code. */
export interface AstOwnExport {
  /**
   * Resolved path of the module this export refers to, when the export is a
   * namespace object (`export * as ns from`, or a re-exported namespace
   * import). `null` when the target specifier does not resolve; absent when
   * the export is not a namespace object.
   */
  namespaceTargetPath?: string | null
  /** Lazily parse the doc comment block attached to the declaration. */
  getDoc?: () => DocCommentBlock | undefined
  /**
   * The name is only inferred from TS `export =` namespace analysis, not
   * written in an explicit export statement.
   */
  inferred?: boolean
}

export interface AstModuleFacts {
  format: 'ambiguous' | 'Module'
  /** The parse error the analysis died on, if any. */
  parseError?: ParseError
  /**
   * Whether the parse produced reliable results (the parser exposed visitor
   * keys) — unreliable results must not be cached.
   */
  cacheable: boolean
  ownExports: Map<string, AstOwnExport>
  reexports: Map<string, { local: string; targetPath: string | null }>
  /** Resolved paths of `export * from '...'` targets. */
  starExportPaths: string[]
  /** Import declarations, keyed by resolved path. */
  imports: Map<string, ModuleImportDeclaration[]>
  defaultExportSourceName?: DefaultExportSourceName
  /** Lazily parse the module-level doc block (carrying an `@module` tag). */
  getModuleDoc?: () => DocCommentBlock | undefined
}

/** Shared state threaded through the per-statement handlers. */
interface Walk {
  facts: AstModuleFacts
  /**
   * Lazily capture the doc comment block attached to the first of `nodes`
   * that has leading comments — or `undefined` when the module cannot carry
   * a deprecation doc at all (see `needDocs` on {@link analyzeAstModule}), in
   * which case no closure is created and the AST stays collectable.
   */
  captureDoc(
    ...nodes: Array<TSESTree.Node | undefined>
  ): (() => DocCommentBlock | undefined) | undefined
  /**
   * `import * as ns from 'x'` / `export * as ns from 'x'` identifiers →
   * source specifier, for when a later statement exports the namespace
   * object.
   */
  namespaces: Map<string, string>
  remotePath(specifier: string): string | null
  isEsModuleInteropTrue(): boolean
  ast: TSESTree.Program
}

/**
 * Produce no doc getter — deliberately not a closure over the AST, which is
 * the entire point of `needDocs === false`.
 */
function noDocCapture(): undefined {}

/**
 * A necessary condition for a dynamic `import()` anywhere in the file: the
 * `import` keyword followed by `(`, with only trivia between.
 *
 * {@link scanDynamicImports} is the one part of extraction that walks the
 * *whole* AST rather than just `Program.body`, and it costs about half of all
 * extraction work (~9% of this route) while almost always finding nothing —
 * only `no-cycle` and `no-unused-modules` ever read import edges at all. This
 * decides whether the traversal is worth running.
 *
 * False positives are harmless: `import('x')` inside a string or comment just
 * means the traversal runs and finds nothing. False negatives are impossible —
 * nothing but whitespace and comments may sit between the keyword and its
 * parenthesis. (`import.meta` has a `.`, and is not a dynamic import.)
 */
const DYNAMIC_IMPORT_HINT_PATTERN =
  /\bimport\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*\(/

/**
 * Parse `content` with the configured ESLint parser and extract the module's
 * facts from its AST.
 *
 * @param needDocs Whether doc-comment getters are worth producing. They are
 *   the only facts that must hold on to the AST, and `module-doc.ts` answers
 *   `undefined` for any module whose raw content carries no deprecation
 *   marker — so for those modules the getters can never be read, and building
 *   them would pin the whole AST (plus its tokens and source text) in
 *   `moduleInfoCache` for the life of the process. Pass `false` and the
 *   analysis retains nothing but its own extracted facts.
 * @returns `null` when the file is not unambiguously a module (and has no
 *   dynamic imports) — CommonJS territory, unanalyzable to rules. Parse
 *   failures return facts carrying `errors` and no exports.
 */
export function analyzeAstModule(
  filepath: string,
  content: string,
  context: ChildContext,
  needDocs: boolean,
): AstModuleFacts | null {
  const facts: AstModuleFacts = {
    format: 'ambiguous',
    cacheable: false,
    ownExports: new Map(),
    reexports: new Map(),
    starExportPaths: [],
    imports: new Map(),
  }

  let ast: TSESTree.Program
  let visitorKeys: TSESLint.SourceCode.VisitorKeys | null
  try {
    ;({ ast, visitorKeys } = parse(filepath, content, context, needDocs))
  } catch (error) {
    facts.parseError = error as ParseError
    return facts // can't continue
  }

  facts.cacheable = !!visitorKeys

  /** For `getCommentsBefore` in doc capture — built only if a doc is read. */
  const getSource = lazy(
    () =>
      new TSESLint.SourceCode({
        text: content,
        // parse() forces comments/tokens/loc/range onto the parser options
        // when `needDocs`, so the AST carries what SourceCode requires at
        // runtime — which is exactly when this is reachable
        ast: ast as TSESLint.SourceCode.Program,
        parserServices: null,
        scopeManager: null,
        visitorKeys: null,
      }),
  )

  const walk: Walk = {
    facts,
    captureDoc: needDocs
      ? (...nodes) => captureDoc(getSource, context.settings, ...nodes)
      : noDocCapture,
    namespaces: new Map(),
    remotePath: specifier =>
      relative(specifier, filepath, context.settings, context) ?? null,
    isEsModuleInteropTrue: lazy(
      () =>
        getTsconfigWithContext(context)?.compilerOptions?.esModuleInterop ??
        false,
    ),
    ast,
  }

  // dynamic `import()` anywhere makes an otherwise-CJS file analyzable
  const hasDynamicImports =
    DYNAMIC_IMPORT_HINT_PATTERN.test(content) &&
    scanDynamicImports(walk, visitorKeys)

  const unambiguouslyESM = lazy(() => isUnambiguousModule(ast))
  if (!hasDynamicImports && !unambiguouslyESM()) {
    return null
  }

  for (const n of ast.body) {
    switch (n.type) {
      case 'ImportDeclaration': {
        handleImport(walk, n)
        break
      }
      case 'ExportDefaultDeclaration': {
        handleExportDefault(walk, n)
        break
      }
      case 'ExportAllDeclaration': {
        handleExportAll(walk, n)
        break
      }
      case 'ExportNamedDeclaration': {
        handleExportNamed(walk, n)
        break
      }
      case 'TSExportAssignment': {
        handleTsExportAssignment(walk, n)
        break
      }
      case 'TSNamespaceExportDeclaration': {
        if (walk.isEsModuleInteropTrue()) {
          handleTsExportAssignment(walk, n)
        }
        break
      }
      // No default — every other statement kind is irrelevant here
    }
  }

  if (needDocs) {
    facts.getModuleDoc = lazy(() => collectModuleDoc(ast))
  }

  // tsconfig `esModuleInterop` synthesizes a default export when anything is
  // exported and no default exists yet
  if (
    walk.isEsModuleInteropTrue() &&
    facts.ownExports.size > 0 &&
    !facts.ownExports.has('default')
  ) {
    addOwnExport(walk, 'default', {})
  }

  if (unambiguouslyESM()) {
    facts.format = 'Module'
  }

  return facts
}

// ─── statement handlers ────────────────────────────────────────────────────

/** `import a, { b, c as d } from './x'` — also tracks `import * as ns`. */
function handleImport(walk: Walk, n: TSESTree.ImportDeclaration) {
  captureEdge(walk, n)

  // remember the namespace object in case a later statement exports it
  const ns = n.specifiers.find(s => s.type === 'ImportNamespaceSpecifier')
  if (ns) {
    walk.namespaces.set(ns.local.name, n.source.value)
  }
}

/** `export default …` */
function handleExportDefault(walk: Walk, n: TSESTree.ExportDefaultDeclaration) {
  addOwnExport(walk, 'default', {
    getDoc: walk.captureDoc(n),
    ...(n.declaration.type === 'Identifier' && {
      namespaceTargetPath: namespaceTargetOf(walk, n.declaration.name),
    }),
  })
  walk.facts.defaultExportSourceName ??= resolveDefaultName(n.declaration)
}

/** `export * from './x'` / `export * as ns from './x'` */
function handleExportAll(walk: Walk, n: TSESTree.ExportAllDeclaration) {
  if (n.exported) {
    // the namespace object is an own export of this module
    walk.namespaces.set(getValue(n.exported), n.source.value)
    addOwnExport(walk, getValue(n.exported), {
      namespaceTargetPath: walk.remotePath(n.source.value),
    })
    return
  }
  const p = captureDependency(walk, n, n.exportKind === 'type')
  if (p != null) {
    walk.facts.starExportPaths.push(p)
  }
}

/**
 * Standard TSESTree only knows `ExportSpecifier`, but legacy
 * `@babel/eslint-parser` also emits the stage-1 export-extensions proposal
 * nodes at runtime — widened once here so the switch discriminates properly.
 */
type MaybeLegacyExportSpecifier =
  | TSESTree.ExportSpecifier
  | ExportDefaultSpecifier
  | ExportNamespaceSpecifier

/** `export const/function/class …` / `export { a as b } [from './x']` */
function handleExportNamed(walk: Walk, n: TSESTree.ExportNamedDeclaration) {
  captureEdge(walk, n)

  if (n.declaration != null) {
    switch (n.declaration.type) {
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
      /* eslint-disable no-fallthrough */
      // @ts-expect-error - flowtype with @babel/eslint-parser
      case 'TypeAlias':
      // @ts-expect-error - legacy parser type
      case 'InterfaceDeclaration':
      // @ts-expect-error - legacy parser type
      case 'DeclareFunction':
      case 'TSDeclareFunction':
      case 'TSEnumDeclaration':
      case 'TSTypeAliasDeclaration':
      case 'TSInterfaceDeclaration':
      // @ts-expect-error - legacy parser type
      case 'TSAbstractClassDeclaration':
      case 'TSModuleDeclaration': {
        addOwnExport(walk, (n.declaration.id as TSESTree.Identifier).name, {
          getDoc: walk.captureDoc(n),
        })
        break
      }
      /* eslint-enable no-fallthrough */
      case 'VariableDeclaration': {
        // `export const { a, b: [c] } = …` — every bound name is an export
        for (const decl of n.declaration.declarations) {
          recursivePatternCapture(decl.id, id => {
            addOwnExport(walk, (id as TSESTree.Identifier).name, {
              getDoc: walk.captureDoc(decl, n),
            })
          })
        }
        break
      }
      // No default — other declaration kinds export no names
    }
  }

  const source = n.source?.value
  for (const s of n.specifiers as readonly MaybeLegacyExportSpecifier[]) {
    switch (s.type) {
      case 'ExportSpecifier': {
        processExportSpecifier(walk, s, source)
        if (source === undefined && getValue(s.exported) === 'default') {
          // export { foo as default }
          walk.facts.defaultExportSourceName ??= resolveDefaultName(s)
        }
        break
      }
      // legacy @babel/eslint-parser nodes for the stage-1 export-extensions
      // proposal syntax:
      case 'ExportDefaultSpecifier': {
        // `export bar from './x'` — re-exports './x'’s default as `bar`
        if (source !== undefined) {
          walk.facts.reexports.set(getValue(s.exported), {
            local: 'default',
            targetPath: walk.remotePath(source),
          })
        }
        break
      }
      case 'ExportNamespaceSpecifier': {
        // `export * as ns from './x'` — the namespace object is an own export
        if (source !== undefined) {
          addOwnExport(walk, getValue(s.exported), {
            namespaceTargetPath: walk.remotePath(source),
          })
        }
        break
      }
    }
  }
}

/**
 * TS `export = X` (and, under `esModuleInterop`, `export as namespace X`) —
 * doesn't declare anything itself, but changes what's being exported: the
 * referenced declarations become the exports, and every member of a
 * referenced `namespace`/`module` block is exported whether or not it is
 * individually marked.
 */
function handleTsExportAssignment(
  walk: Walk,
  n: TSESTree.ProgramStatement,
): void {
  const exportedName =
    n.type === 'TSNamespaceExportDeclaration'
      ? (
          n.id ||
          // @ts-expect-error - legacy parser type
          n.name
        ).name
      : ('expression' in n &&
          n.expression &&
          (('name' in n.expression && n.expression.name) ||
            ('id' in n.expression &&
              n.expression.id &&
              n.expression.id.name))) ||
        null

  const exportedDecls = walk.ast.body.filter(
    node =>
      declTypes.has(node.type) &&
      (('id' in node &&
        node.id &&
        ('name' in node.id
          ? node.id.name === exportedName
          : 'left' in node.id && getRoot(node.id).name === exportedName)) ||
        ('declarations' in node &&
          node.declarations.some(
            d => 'name' in d.id && d.id.name === exportedName,
          ))),
  )

  if (exportedDecls.length === 0) {
    // not referencing any local declaration, must be re-exporting
    addOwnExport(walk, 'default', {
      getDoc: walk.captureDoc(n),
    })
    return
  }

  if (walk.isEsModuleInteropTrue() && !walk.facts.ownExports.has('default')) {
    addOwnExport(walk, 'default', {})
  }

  for (const decl of exportedDecls) {
    if (decl.type === 'TSModuleDeclaration') {
      inferNamespaceMembers(walk, decl)
    } else {
      // export as default
      addOwnExport(walk, 'default', {
        getDoc: walk.captureDoc(decl),
      })
    }
  }
}

/**
 * Every member of an `export =`-referenced `namespace N { … }` block is an
 * export, explicitly marked or not.
 */
function inferNamespaceMembers(walk: Walk, decl: TSESTree.TSModuleDeclaration) {
  const type = decl.body?.type

  // @ts-expect-error - legacy parser type
  if (type === 'TSModuleDeclaration') {
    // @ts-expect-error - legacy parser type
    addOwnExport(walk, (decl.body.id as TSESTree.Identifier).name, {
      getDoc: walk.captureDoc(decl.body),
    })
    return
  } else if (type === 'TSModuleBlock' && decl.kind === 'namespace') {
    const getDoc = walk.captureDoc(decl.body)
    // the namespace name itself is inferred — `hasExplicitExport` skips it
    if ('name' in decl.id) {
      addOwnExport(walk, decl.id.name, { getDoc, inferred: true })
    } else {
      // TODO: handle left TSQualifiedName: `declare module foo.bar.baz`
      addOwnExport(walk, decl.id.right.name, { getDoc, inferred: true })
    }
  }

  if (!decl.body?.body) {
    return
  }
  for (const moduleBlockNode of decl.body.body) {
    const namespaceDecl =
      moduleBlockNode.type === 'ExportNamedDeclaration'
        ? moduleBlockNode.declaration
        : moduleBlockNode

    if (!namespaceDecl) {
      // TypeScript can check this for us; we needn't
    } else if (namespaceDecl.type === 'VariableDeclaration') {
      for (const d of namespaceDecl.declarations) {
        recursivePatternCapture(d.id, id => {
          addOwnExport(walk, (id as TSESTree.Identifier).name, {
            getDoc: walk.captureDoc(decl, namespaceDecl, moduleBlockNode),
          })
        })
      }
    } else if ('id' in namespaceDecl) {
      addOwnExport(walk, (namespaceDecl.id as TSESTree.Identifier).name, {
        getDoc: walk.captureDoc(moduleBlockNode),
      })
    }
  }
}

// ─── shared capture helpers ────────────────────────────────────────────────

/**
 * `export { a, b as c }` — own exports (a name may be a tracked namespace
 * object); `export { a as b } from './x'` — re-export records.
 */
function processExportSpecifier(
  walk: Walk,
  s: TSESTree.ExportSpecifier,
  source: string | undefined,
) {
  const exported = getValue(s.exported)
  if (source === undefined) {
    addOwnExport(walk, exported, {
      namespaceTargetPath: namespaceTargetOf(walk, getValue(s.local)),
    })
  } else {
    walk.facts.reexports.set(exported, {
      local: getValue(s.local),
      targetPath: walk.remotePath(source),
    })
  }
}

/**
 * Record an import edge for a statement with specifiers, deriving the
 * imported names and type-only-ness (`import type { Foo }`,
 * `import { type Foo }`, Flow's `typeof`).
 */
function captureEdge(
  walk: Walk,
  n: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
) {
  const declarationIsType =
    'importKind' in n &&
    (n.importKind === 'type' ||
      // @ts-expect-error - flow type
      n.importKind === 'typeof')
  // import './foo' or import {} from './foo' (both 0 specifiers) is a side
  // effect and shouldn't be considered to be just importing types
  let specifiersOnlyImportingTypes = n.specifiers.length > 0
  const imported = {
    names: new Set<string>(),
    default: false,
    namespace: false,
  }
  for (const specifier of n.specifiers) {
    switch (specifier.type) {
      case 'ImportSpecifier': {
        imported.names.add(getValue(specifier.imported))

        break
      }
      case 'ImportDefaultSpecifier': {
        imported.default = true

        break
      }
      case 'ImportNamespaceSpecifier': {
        imported.namespace = true

        break
      }
      // No default
    }

    specifiersOnlyImportingTypes =
      specifiersOnlyImportingTypes &&
      'importKind' in specifier &&
      (specifier.importKind === 'type' ||
        // @ts-expect-error - flow type
        specifier.importKind === 'typeof')
  }
  return captureDependency(
    walk,
    n,
    declarationIsType || specifiersOnlyImportingTypes,
    imported,
  )
}

/** Record an import edge, keyed by resolved path. */
function captureDependency(
  walk: Walk,
  {
    source,
  }:
    | TSESTree.ExportAllDeclaration
    | TSESTree.ImportDeclaration
    | TSESTree.ExportNamedDeclaration,
  isOnlyImportingTypes: boolean,
  imported?: ModuleImportDeclaration['imported'],
): string | null {
  if (source == null) {
    return null
  }

  const p = walk.remotePath(source.value)
  if (p == null) {
    return null
  }

  addImportDeclaration(walk, p, {
    source: {
      // capturing actual node reference holds full AST in memory!
      value: source.value,
      loc: source.loc,
    },
    isOnlyImportingTypes,
    imported,
  })
  return p
}

function addImportDeclaration(
  walk: Walk,
  path: string,
  declaration: ModuleImportDeclaration,
) {
  const existing = walk.facts.imports.get(path)
  if (existing) {
    existing.push(declaration)
  } else {
    walk.facts.imports.set(path, [declaration])
  }
}

function addOwnExport(walk: Walk, name: string, meta: AstOwnExport): void {
  walk.facts.ownExports.set(name, meta)
}

/** The re-export target when `identifier` is a tracked namespace object. */
function namespaceTargetOf(
  walk: Walk,
  identifier: string,
): string | null | undefined {
  const specifier = walk.namespaces.get(identifier)
  if (specifier === undefined) {
    return undefined
  }
  return walk.remotePath(specifier)
}

// ─── everything below is statement-independent ─────────────────────────────

/** Record `import('…')` edges anywhere in the AST. */
function scanDynamicImports(
  walk: Walk,
  visitorKeys: TSESLint.SourceCode.VisitorKeys | null,
): boolean {
  let hasDynamicImports = false

  function processDynamicImport(source: TSESTree.CallExpressionArgument) {
    hasDynamicImports = true
    // only a plain string specifier can be resolved: `import(42)`,
    // `import(tpl)` and friends carry no path
    if (source.type !== 'Literal' || typeof source.value !== 'string') {
      return
    }
    const p = walk.remotePath(source.value)
    if (p == null) {
      return
    }
    addImportDeclaration(walk, p, {
      source: {
        // capturing actual node reference holds full AST in memory!
        value: source.value,
        loc: source.loc,
      },
      // a dynamic import binds the whole namespace
      imported: { names: new Set(), default: false, namespace: true },
      dynamic: true,
    })
  }

  visit(walk.ast, visitorKeys, {
    ImportExpression(node) {
      processDynamicImport((node as TSESTree.ImportExpression).source)
    },
    CallExpression(_node) {
      const node = _node as TSESTree.CallExpression
      // @ts-expect-error - legacy parser type
      if (node.callee.type === 'Import') {
        processDynamicImport(node.arguments[0])
      }
    },
  })

  return hasDynamicImports
}

/** The AST-route counterpart of the lexer's `deriveDefaultExportSourceName`. */
function resolveDefaultName(
  node:
    | TSESTree.ExportSpecifier
    | TSESTree.DefaultExportDeclarations
    | TSESTree.CallExpressionArgument
    | undefined,
): DefaultExportSourceName | undefined {
  if (node == null) {
    return
  }
  switch (node.type) {
    case 'AssignmentExpression': {
      // export default Foo = 1;
      if (node.left.type !== 'Identifier') {
        return
      }
      return { name: node.left.name, isBoundName: true }
    }
    case 'CallExpression': {
      // export default withHoc(Foo)
      return resolveDefaultName(node.arguments[0])
    }
    case 'ClassDeclaration': {
      // anonymous classes have no name to preserve
      return node.id && typeof node.id.name === 'string'
        ? { name: node.id.name, isBoundName: false }
        : undefined
    }
    case 'ExportSpecifier': {
      // export { foo as default }
      return { name: getValue(node.local), isBoundName: false }
    }
    case 'FunctionDeclaration': {
      const name = node.id?.name
      return name == null ? undefined : { name, isBoundName: false }
    }
    case 'Identifier': {
      // const foo = 'foo'; export default foo;
      return { name: node.name, isBoundName: true }
    }
    default: {
      // unhandled node type: no name can be determined
      return
    }
  }
}

/** The first block comment carrying an `@module` tag. */
function collectModuleDoc(ast: TSESTree.Program): DocCommentBlock | undefined {
  if (!ast.comments?.length) {
    return
  }
  for (const c of ast.comments) {
    if (c.type !== 'Block') {
      continue
    }
    try {
      const doc = parseComment(c.value)
      if (doc.tags.some(t => t.tag === 'module')) {
        return doc
      }
    } catch {
      /* ignore */
    }
  }
}

/** Statement kinds a TS `export =` may reference. */
const declTypes = new Set([
  'VariableDeclaration',
  'ClassDeclaration',
  'TSDeclareFunction',
  'TSEnumDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSAbstractClassDeclaration',
  'TSModuleDeclaration',
])

/** `A.B.C` → `A` */
function getRoot(node: TSESTree.TSQualifiedName): TSESTree.Identifier {
  if (node.left.type === 'TSQualifiedName') {
    return getRoot(node.left)
  }
  return node.left as TSESTree.Identifier
}
