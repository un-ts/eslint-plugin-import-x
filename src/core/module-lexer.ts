import type { TSESTree } from '@typescript-eslint/utils'
// eslint-disable-next-line import-x/no-unresolved -- cjs-module-lexer@2.2.0 declares `types: ./lexer.d.mts` in its exports map but does not publish the file; runtime (`default` condition) and tsc both resolve fine
import * as cjsModuleLexer from 'cjs-module-lexer'
import * as esModuleLexer from 'es-module-lexer'

/**
 * Lexer-based analysis of external (`node_modules`) JavaScript modules — the
 * fast path that avoids running a full ESLint parser on third-party code.
 * Pure lexing only: this module knows nothing about `ModuleInfo`.
 *
 * ESLint rules are synchronous, so both lexers are initialized with their
 * Node.js-specific `initSync()` (synchronous WebAssembly compilation).
 */

/** An `import`/`export ... from`/`import()` edge found by the lexer. */
export interface LexedImport {
  specifier: string
  /** Location of the specifier string literal (quotes included). */
  loc: TSESTree.SourceLocation
  dynamic: boolean
  /** The edge comes from a plain `export * from '...'` statement. */
  starReexport: boolean
}

/** One `export { local as exported } from '...'`. */
export interface LexedReexport {
  exported: string
  local: string
  specifier: string
}

/** One `export * as ns from '...'`. */
export interface LexedNamespaceReexport {
  exported: string
  specifier: string
}

/** The name a module's default export is declared under, in that module. */
export interface DefaultExportSourceName {
  name: string
  /**
   * `true` when the name comes from a renamable binding (an identifier
   * reference or an assignment) rather than a declaration (class/function
   * declaration or an explicit `export { x as default }` specifier).
   */
  isBoundName: boolean
}

export interface LexedEsModule {
  /**
   * `'module'` — has import/export declarations; `'ambiguous'` — only
   * dynamic `import()` was found (same distinction the AST path draws).
   */
  format: 'module' | 'ambiguous'
  /** Names exported by the module's own code (including `default`). */
  ownExports: string[]
  reexports: LexedReexport[]
  namespaceReexports: LexedNamespaceReexport[]
  imports: LexedImport[]
  /**
   * Derived without a parser and definitive for lexable JavaScript:
   * `undefined` means the module has no (nameable) default export, matching
   * what the AST route would answer — do not escalate. Known fail-open
   * corners (both yield `undefined` where the AST finds a name):
   * assignments as call arguments (`withHoc(Foo = 1)`) and ASI-continued
   * default expressions.
   */
  defaultExportSourceName?: DefaultExportSourceName
}

/**
 * A script with no ES module syntax at all — CommonJS territory. The
 * cjs-module-lexer output is carried along for future use (Node uses it for
 * ESM→CJS named-export interop), but rules currently treat CJS modules as
 * unanalyzable, matching the AST path.
 */
export interface LexedScript {
  format: 'script'
  exports: string[]
  reexports: string[]
}

export type LexedModule = LexedEsModule | LexedScript

/** Extensions the lexers can handle — plain JavaScript only. */
export const LEXABLE_EXTENSIONS_PATTERN = /\.[cm]?js$/

let lexersReady: boolean | undefined

function ensureLexersInitialized(): boolean {
  if (lexersReady === undefined) {
    try {
      esModuleLexer.initSync()
      cjsModuleLexer.initSync()
      lexersReady = true
    } catch {
      lexersReady = false
    }
  }
  return lexersReady
}

const BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT_PATTERN = /\/\/.*$/gm
const EXPORT_STAR_AS_PATTERN = /^export\s*\*\s*as\s/
const EXPORT_STAR_PATTERN = /^export\s*\*/
const REEXPORT_ENTRY_PATTERN = /^(?:([\w$]+)\s+as\s+)?([\w$]+)$/

function stripComments(statement: string) {
  return statement
    .replaceAll(BLOCK_COMMENT_PATTERN, ' ')
    .replaceAll(LINE_COMMENT_PATTERN, ' ')
    .trimStart()
}

/**
 * Comment-stripped source text of a statement, memoized by its start offset —
 * both the export-from scan and the import-edge scan need the same slices, and
 * stripping allocates two intermediate strings each time.
 */
function createStatementReader(content: string) {
  const cache = new Map<number, string>()
  return (imp: esModuleLexer.ImportSpecifier) => {
    let statement = cache.get(imp.ss)
    if (statement === undefined) {
      statement = stripComments(content.slice(imp.ss, imp.se))
      cache.set(imp.ss, statement)
    }
    return statement
  }
}

const EXPORT_DEFAULT_PATTERN = /^export\s+default\s+/
const CALL_HEAD_PATTERN = /^[A-Za-z_$][\w$]*\s*\(\s*/
const PAREN_HEAD_PATTERN = /^\(\s*/
const IDENTIFIER_HEAD_PATTERN = /^[A-Za-z_$][\w$]*/
/**
 * Tokens that continue an expression after an identifier — not a bare name.
 * `=` is included: plain assignment is recognized explicitly beforehand, so
 * a remaining `=` is an arrow (`=>`) or comparison (`==`).
 */
const EXPRESSION_CONTINUATION_PATTERN = /^[.([`+\-*/%<>&|^?,:!~=]/
/** Words the identifier pattern matches that can never be a default's name. */
const NON_NAME_KEYWORDS = new Set([
  'async',
  'await',
  'class',
  'delete',
  'do',
  'false',
  'function',
  'if',
  'in',
  'instanceof',
  'new',
  'null',
  'switch',
  'this',
  'true',
  'typeof',
  'void',
  'yield',
] as const)

/**
 * Derive the default export's declared name from the statement text —
 * mirroring the AST route's `resolveDefaultName` for the `ln`-less shapes:
 * a bare identifier, an assignment, or an identifier threaded through call
 * wrappers (`withHoc(Foo)`). Anything else (objects, literals, anonymous
 * functions/classes, arrows) has no name on the AST route either.
 */
function deriveDefaultExportSourceName(
  head: string,
  localName: string | undefined,
): DefaultExportSourceName | undefined {
  // es-module-lexer reports the local name for every *declared* form:
  // `export default function foo` / `class Foo` / `export { x as default }`
  if (localName != null) {
    return { name: localName, isBoundName: false }
  }

  const statement = EXPORT_DEFAULT_PATTERN.exec(head)
  if (!statement) {
    return
  }
  let expression = head.slice(statement[0].length)

  // unwrap call wrappers and parentheses: `withHoc(hoc2(Foo))` → `Foo`
  let insideCall = false
  for (let depth = 0; depth < 8; depth++) {
    const call = CALL_HEAD_PATTERN.exec(expression)
    if (call && !NON_NAME_KEYWORDS.has(call[0].replace(/\s*\(\s*$/, ''))) {
      expression = expression.slice(call[0].length)
      insideCall = true
      continue
    }
    const paren = PAREN_HEAD_PATTERN.exec(expression)
    if (paren) {
      expression = expression.slice(paren[0].length)
      continue
    }
    break
  }

  const identifier = IDENTIFIER_HEAD_PATTERN.exec(expression)
  if (!identifier || NON_NAME_KEYWORDS.has(identifier[0])) {
    return
  }
  const name = identifier[0]
  const rest = expression.slice(name.length).replace(/^\s+/, '')

  if (insideCall) {
    // the identifier must be a plain call argument
    return rest.startsWith(')') || rest.startsWith(',')
      ? { name, isBoundName: true }
      : undefined
  }
  // `export default Foo = 1` (but not `==` comparison or `=>` arrow)
  if (/^=(?![=>])/.test(rest)) {
    return { name, isBoundName: true }
  }
  // a bare identifier: nothing may continue the expression
  return rest === '' || !EXPRESSION_CONTINUATION_PATTERN.test(rest)
    ? { name, isBoundName: true }
    : undefined
}

/**
 * Extract the `exported → local` pairs of a named re-export statement
 * (`export { a, b as c } from '...'`) from its source text — es-module-lexer
 * does not report local names of re-exported bindings.
 */
function parseReexportLocals(statement: string) {
  const locals = new Map<string, string>()
  const open = statement.indexOf('{')
  const close = statement.indexOf('}')
  if (open === -1 || close === -1 || close < open) {
    return locals
  }
  for (const rawEntry of statement.slice(open + 1, close).split(',')) {
    const entry = rawEntry.trim()
    if (!entry) {
      continue
    }
    const match = REEXPORT_ENTRY_PATTERN.exec(entry)
    if (match) {
      const [, local, name] = match
      // `x` → local x, exported x; `x as y` → local x, exported y
      locals.set(name, local ?? name)
    }
  }
  return locals
}

/**
 * Offsets → `{ line, column }`, resolved eagerly by the caller so that
 * nothing downstream keeps `content` alive: a cached `ModuleInfo` must not
 * retain the source text of a bundled dependency (see `needDocs` on
 * `analyzeAstModule` for the same concern on the AST route).
 */
function createOffsetToLoc(content: string) {
  let lineStarts: number[] | undefined

  function position(offset: number): TSESTree.Position {
    if (!lineStarts) {
      // native search beats a per-character scan: one step per line, not
      // one per byte
      lineStarts = [0]
      for (
        let i = content.indexOf('\n');
        i !== -1;
        i = content.indexOf('\n', i + 1)
      ) {
        lineStarts.push(i + 1)
      }
    }
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if (lineStarts[mid] <= offset) {
        low = mid
      } else {
        high = mid - 1
      }
    }
    return { line: low + 1, column: offset - lineStarts[low] }
  }

  return (start: number, end: number): TSESTree.SourceLocation => ({
    start: position(start),
    end: position(end),
  })
}

/**
 * Lex a JavaScript module.
 *
 * Caveat: es-module-lexer is permissive about some invalid-ESM syntax — e.g.
 * Flow's `import type { x } from '...'` does NOT throw — so uncompiled
 * Flow-typed files may be lexed as ESM with type imports treated as value
 * imports. Rare for published packages, and failures lean open (missed
 * reports, not false ones).
 *
 * @returns The lexed shape, or `null` when the lexers cannot handle the file
 *   (initialization failure or a lexer parse error, e.g. JSX) — the caller
 *   must fall back to the full AST-parse route.
 */
export function lexModule(
  content: string,
  filepath: string,
): LexedModule | null {
  if (!ensureLexersInitialized()) {
    return null
  }

  let imports: readonly esModuleLexer.ImportSpecifier[]
  let exports: readonly esModuleLexer.ExportSpecifier[]
  let hasModuleSyntax: boolean
  try {
    ;[imports, exports, , hasModuleSyntax] = esModuleLexer.parse(
      content,
      filepath,
    )
  } catch {
    return null
  }

  // Mirror the AST path's module-format decision (`isUnambiguousModule`):
  // import/export *declarations* make a module; a lone `import.meta`
  // (hasModuleSyntax, but no declaration) does not.
  const isModule =
    hasModuleSyntax &&
    (exports.length > 0 ||
      imports.some(i => i.d === -1) ||
      !imports.some(i => i.d === -2))

  if (!isModule) {
    if (imports.some(i => i.d >= 0)) {
      // dynamic `import()` only — same as the AST path's dynamic-import scan:
      // the module stays 'ambiguous' but its dynamic edges are recorded
      return {
        format: 'ambiguous',
        ownExports: [],
        reexports: [],
        namespaceReexports: [],
        // no static import declarations can exist here (see `isModule`), so
        // no statement text is ever read
        imports: collectImportEdges(
          content,
          imports,
          new Set(),
          createStatementReader(content),
        ),
      }
    }

    // no ES module syntax at all — CommonJS territory
    try {
      const { exports: cjsExports, reexports: cjsReexports } =
        cjsModuleLexer.parse(content, filepath)
      return { format: 'script', exports: cjsExports, reexports: cjsReexports }
    } catch {
      return null
    }
  }

  const readStatement = createStatementReader(content)

  const ownExports: string[] = []
  const reexports: LexedReexport[] = []
  const namespaceReexports: LexedNamespaceReexport[] = []

  // export-from statements, keyed by statement start offset
  const exportFromStatements = new Map<
    number,
    { specifier: string; statement: string; starAs: boolean }
  >()
  const skippedImportEdges = new Set<number>()

  for (const imp of imports) {
    if (imp.d !== -1 || imp.n == null) {
      continue
    }
    const statement = readStatement(imp)
    if (!statement.startsWith('export')) {
      continue
    }
    const starAs = EXPORT_STAR_AS_PATTERN.test(statement)
    if (starAs) {
      // parity with the AST path: `export * as ns from` gets a lazy
      // namespace, not an import edge
      skippedImportEdges.add(imp.ss)
    }
    exportFromStatements.set(imp.ss, { specifier: imp.n, statement, starAs })
  }

  let defaultExportSourceName: DefaultExportSourceName | undefined

  for (const exp of exports) {
    const stmt = exportFromStatements.get(exp.ss)
    if (!stmt) {
      ownExports.push(exp.n)
      if (exp.n === 'default') {
        defaultExportSourceName = deriveDefaultExportSourceName(
          stripComments(content.slice(exp.ss, exp.ss + 512)),
          exp.ln,
        )
      }
      continue
    }
    if (stmt.starAs) {
      namespaceReexports.push({ exported: exp.n, specifier: stmt.specifier })
      continue
    }
    // `export { a, b as c } from '...'` — recover the local name
    const local = exp.ln ?? parseReexportLocals(stmt.statement).get(exp.n)
    if (local == null) {
      // exotic syntax (e.g. string export names): model as an own export so
      // lookups still succeed (fails open, no deep verification)
      ownExports.push(exp.n)
    } else {
      reexports.push({ exported: exp.n, local, specifier: stmt.specifier })
    }
  }

  return {
    format: 'module',
    ownExports,
    reexports,
    namespaceReexports,
    imports: collectImportEdges(
      content,
      imports,
      skippedImportEdges,
      readStatement,
    ),
    ...(defaultExportSourceName && { defaultExportSourceName }),
  }
}

function collectImportEdges(
  content: string,
  imports: readonly esModuleLexer.ImportSpecifier[],
  skippedStatements: ReadonlySet<number>,
  readStatement: (imp: esModuleLexer.ImportSpecifier) => string,
): LexedImport[] {
  const offsetToLoc = createOffsetToLoc(content)
  const edges: LexedImport[] = []
  for (const imp of imports) {
    // skip `import.meta` (d === -2) and dynamic imports whose specifier is
    // not a plain string (n == null) — matching the AST path
    if (imp.d < -1 || imp.n == null || skippedStatements.has(imp.ss)) {
      continue
    }
    const dynamic = imp.d >= 0
    let starReexport = false
    if (!dynamic) {
      const statement = readStatement(imp)
      starReexport =
        statement.startsWith('export') &&
        EXPORT_STAR_PATTERN.test(statement) &&
        !EXPORT_STAR_AS_PATTERN.test(statement)
    }
    edges.push({
      specifier: imp.n,
      // include the quotes, like a string literal AST node's loc
      loc: offsetToLoc(imp.s - 1, imp.e + 1),
      dynamic,
      starReexport,
    })
  }
  return edges
}
