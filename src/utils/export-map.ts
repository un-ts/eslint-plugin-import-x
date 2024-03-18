import fs from 'node:fs'
import path from 'node:path'

import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import debug from 'debug'
import type { Annotation } from 'doctrine'
import doctrine from 'doctrine'
import type { AST } from 'eslint'
import { SourceCode } from 'eslint'
import type { TsConfigJsonResolved } from 'get-tsconfig'
import { getTsconfig } from 'get-tsconfig'

import type {
  ChildContext,
  DocStyle,
  ExportDefaultSpecifier,
  ExportNamespaceSpecifier,
  ParseError,
  RuleContext,
} from '../types'

import { hashObject } from './hash'
import { hasValidExtension, ignore } from './ignore'
import { parse } from './parse'
import { relative, resolve } from './resolve'
import { isMaybeUnambiguousModule, isUnambiguousModule } from './unambiguous'
import { visit } from './visit'

const log = debug('eslint-plugin-import-x:ExportMap')

const exportCache = new Map<string, ExportMap | null>()

const tsconfigCache = new Map<string, TsConfigJsonResolved | null>()

export type DocStyleParsers = Record<
  DocStyle,
  (comments: TSESTree.Comment[]) => Annotation | undefined
>

export type DeclarationMetadata = {
  source: Pick<TSESTree.Literal, 'value' | 'loc'>
  importedSpecifiers?: Set<string>
  dynamic?: boolean
  isOnlyImportingTypes?: boolean
}

export type ModuleNamespace = {
  doc?: Annotation
  namespace?: ExportMap | null
}

export type ModuleImport = {
  getter: () => ExportMap | null
  declarations: Set<DeclarationMetadata>
}

export class ExportMap {
  static for(context: ChildContext) {
    const { path: filepath } = context

    const cacheKey = context.cacheKey || hashObject(context).digest('hex')
    let exportMap = exportCache.get(cacheKey)

    // return cached ignore
    if (exportMap === null) {
      return null
    }

    const stats = fs.statSync(context.path)
    if (
      exportMap != null && // date equality check
      exportMap.mtime.valueOf() - stats.mtime.valueOf() === 0
    ) {
      return exportMap
    }
    // future: check content equality?

    // check valid extensions first
    if (!hasValidExtension(filepath, context)) {
      exportCache.set(cacheKey, null)
      return null
    }

    // check for and cache ignore
    if (ignore(filepath, context)) {
      log('ignored path due to ignore settings:', filepath)
      exportCache.set(cacheKey, null)
      return null
    }

    const content = fs.readFileSync(filepath, { encoding: 'utf8' })

    // check for and cache unambiguous modules
    if (!isMaybeUnambiguousModule(content)) {
      log('ignored path due to unambiguous regex:', filepath)
      exportCache.set(cacheKey, null)
      return null
    }

    log('cache miss', cacheKey, 'for path', filepath)
    exportMap = ExportMap.parse(filepath, content, context)

    // ambiguous modules return null
    if (exportMap == null) {
      log('ignored path due to ambiguous parse:', filepath)
      exportCache.set(cacheKey, null)
      return null
    }

    exportMap.mtime = stats.mtime

    exportCache.set(cacheKey, exportMap)

    return exportMap
  }

  static get(source: string, context: RuleContext) {
    const path = resolve(source, context)
    if (path == null) {
      return null
    }

    return ExportMap.for(childContext(path, context))
  }

  static parse(filepath: string, content: string, context: ChildContext) {
    const m = new ExportMap(filepath)
    const isEsModuleInteropTrue = isEsModuleInterop()

    let ast: TSESTree.Program
    let visitorKeys: TSESLint.SourceCode.VisitorKeys | null
    try {
      ;({ ast, visitorKeys } = parse(filepath, content, context))
    } catch (error) {
      m.errors.push(error as ParseError)
      return m // can't continue
    }

    m.visitorKeys = visitorKeys

    let hasDynamicImports = false

    function processDynamicImport(source: TSESTree.CallExpressionArgument) {
      hasDynamicImports = true
      if (source.type !== 'Literal') {
        return null
      }
      const p = remotePath(source.value as string)
      if (p == null) {
        return null
      }
      const getter = thunkFor(p, context)
      m.imports.set(p, {
        getter,
        declarations: new Set([
          {
            source: {
              // capturing actual node reference holds full AST in memory!
              value: source.value,
              loc: source.loc,
            },
            importedSpecifiers: new Set(['ImportNamespaceSpecifier']),
            dynamic: true,
          },
        ]),
      })
    }

    visit(ast, visitorKeys, {
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

    const unambiguouslyESM = isUnambiguousModule(ast)
    if (!unambiguouslyESM && !hasDynamicImports) {
      return null
    }

    const docStyles = (context.settings &&
      context.settings['import-x/docstyle']) || ['jsdoc']

    const docStyleParsers = {} as DocStyleParsers

    for (const style of docStyles) {
      docStyleParsers[style] = availableDocStyleParsers[style]
    }

    // attempt to collect module doc
    if (ast.comments) {
      ast.comments.some(c => {
        if (c.type !== 'Block') {
          return false
        }
        try {
          const doc = doctrine.parse(c.value, { unwrap: true })
          if (doc.tags.some(t => t.title === 'module')) {
            m.doc = doc
            return true
          }
        } catch {
          /* ignore */
        }
        return false
      })
    }

    const namespaces = new Map()

    function remotePath(value: string) {
      return relative(value, filepath, context.settings)
    }

    function resolveImport(value: string) {
      const rp = remotePath(value)
      if (rp == null) {
        return null
      }
      return ExportMap.for(childContext(rp, context))
    }

    function getNamespace(identifier: TSESTree.Identifier | string) {
      const namespace =
        typeof identifier === 'string' ? identifier : identifier.name
      if (!namespaces.has(namespace)) {
        return
      }

      return function () {
        return resolveImport(namespaces.get(namespace))
      }
    }

    function addNamespace(
      object: object,
      identifier: TSESTree.Identifier | string,
    ) {
      const namespace =
        typeof identifier === 'string' ? identifier : identifier.name
      const nsfn = getNamespace(namespace)
      if (nsfn) {
        Object.defineProperty(object, 'namespace', { get: nsfn })
      }
      return object
    }

    function processSpecifier(
      s:
        | TSESTree.ExportAllDeclaration
        | TSESTree.ExportSpecifier
        | ExportDefaultSpecifier
        | ExportNamespaceSpecifier,
      n: TSESTree.Identifier | TSESTree.ProgramStatement,
      m: ExportMap,
    ) {
      const nsource = ('source' in n &&
        n.source &&
        (n.source as TSESTree.StringLiteral).value) as string

      const exportMeta: ModuleNamespace = {}

      let local: string

      switch (s.type) {
        case 'ExportDefaultSpecifier': {
          if (!nsource) {
            return
          }
          local = 'default'
          break
        }
        case 'ExportNamespaceSpecifier': {
          m.namespace.set(
            s.exported.name,
            Object.defineProperty(exportMeta, 'namespace', {
              get() {
                return resolveImport(nsource)
              },
            }),
          )
          return
        }
        case 'ExportAllDeclaration': {
          m.namespace.set(
            s.exported!.name ||
              // @ts-expect-error - legacy parser type
              s.exported!.value,
            addNamespace(exportMeta, s.source.value),
          )
          return
        }
        case 'ExportSpecifier': {
          if (!('source' in n && n.source)) {
            m.namespace.set(
              s.exported.name ||
                // @ts-expect-error - legacy parser type
                s.exported.value,
              addNamespace(exportMeta, s.local),
            )
            return
          }
        }
        // else falls through
        default: {
          if ('local' in s) {
            local = s.local.name
          } else {
            throw new Error('Unknown export specifier type')
          }
          break
        }
      }

      if ('exported' in s) {
        // todo: JSDoc
        m.reexports.set(s.exported.name, {
          local,
          getImport: () => resolveImport(nsource),
        })
      }
    }

    function captureDependencyWithSpecifiers(
      n: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
    ) {
      // import type { Foo } (TS and Flow); import typeof { Foo } (Flow)
      const declarationIsType =
        'importKind' in n &&
        (n.importKind === 'type' ||
          // @ts-expect-error - flow type
          n.importKind === 'typeof')
      // import './foo' or import {} from './foo' (both 0 specifiers) is a side effect and
      // shouldn't be considered to be just importing types
      let specifiersOnlyImportingTypes = n.specifiers.length > 0
      const importedSpecifiers = new Set<string>()
      for (const specifier of n.specifiers) {
        if (specifier.type === 'ImportSpecifier') {
          importedSpecifiers.add(
            specifier.imported.name ||
              // @ts-expect-error - legacy parser type
              specifier.imported.value,
          )
        } else if (supportedImportTypes.has(specifier.type)) {
          importedSpecifiers.add(specifier.type)
        }

        // import { type Foo } (TypeScript/Flow); import { typeof Foo } (Flow)
        specifiersOnlyImportingTypes =
          specifiersOnlyImportingTypes &&
          'importKind' in specifier &&
          (specifier.importKind === 'type' ||
            // @ts-expect-error - flow type
            specifier.importKind === 'typeof')
      }
      captureDependency(
        n,
        declarationIsType || specifiersOnlyImportingTypes,
        importedSpecifiers,
      )
    }

    function captureDependency(
      {
        source,
      }:
        | TSESTree.ExportAllDeclaration
        | TSESTree.ImportDeclaration
        | TSESTree.ExportNamedDeclaration,
      isOnlyImportingTypes: boolean,
      importedSpecifiers = new Set<string>(),
    ) {
      if (source == null) {
        return null
      }

      const p = remotePath(source.value)
      if (p == null) {
        return null
      }

      const declarationMetadata: DeclarationMetadata = {
        // capturing actual node reference holds full AST in memory!
        source: {
          value: source.value,
          loc: source.loc,
        },
        isOnlyImportingTypes,
        importedSpecifiers,
      }

      const existing = m.imports.get(p)
      if (existing != null) {
        existing.declarations.add(declarationMetadata)
        return existing.getter
      }

      const getter = thunkFor(p, context)
      m.imports.set(p, { getter, declarations: new Set([declarationMetadata]) })
      return getter
    }

    const source = makeSourceCode(content, ast)

    function isEsModuleInterop() {
      const parserOptions = context.parserOptions || {}
      let tsconfigRootDir = parserOptions.tsconfigRootDir
      const project = parserOptions.project
      const cacheKey = hashObject({
        tsconfigRootDir,
        project,
      }).digest('hex')
      let tsConfig = tsconfigCache.get(cacheKey)
      if (tsConfig === undefined) {
        tsconfigRootDir = tsconfigRootDir || process.cwd()
        let tsconfigResult
        if (project) {
          const projects = Array.isArray(project) ? project : [project]
          for (const project of projects) {
            tsconfigResult = getTsconfig(
              project === true
                ? context.filename
                : path.resolve(tsconfigRootDir, project),
            )
            if (tsconfigResult) {
              break
            }
          }
        } else {
          tsconfigResult = getTsconfig(tsconfigRootDir)
        }
        tsConfig = (tsconfigResult && tsconfigResult.config) || null
        tsconfigCache.set(cacheKey, tsConfig)
      }

      return tsConfig && tsConfig.compilerOptions
        ? tsConfig.compilerOptions.esModuleInterop
        : false
    }

    for (const n of ast.body) {
      if (n.type === 'ExportDefaultDeclaration') {
        const exportMeta = captureDoc(source, docStyleParsers, n)
        if (n.declaration.type === 'Identifier') {
          addNamespace(exportMeta, n.declaration)
        }
        m.namespace.set('default', exportMeta)
        continue
      }

      if (n.type === 'ExportAllDeclaration') {
        const getter = captureDependency(n, n.exportKind === 'type')
        if (getter) {
          m.dependencies.add(getter)
        }
        if (n.exported) {
          processSpecifier(n, n.exported, m)
        }
        continue
      }

      // capture namespaces in case of later export
      if (n.type === 'ImportDeclaration') {
        captureDependencyWithSpecifiers(n)

        const ns = n.specifiers.find(s => s.type === 'ImportNamespaceSpecifier')
        if (ns) {
          namespaces.set(ns.local.name, n.source.value)
        }
        continue
      }

      if (n.type === 'ExportNamedDeclaration') {
        captureDependencyWithSpecifiers(n)

        // capture declaration
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
              m.namespace.set(
                (n.declaration.id as TSESTree.Identifier).name,
                captureDoc(source, docStyleParsers, n),
              )
              break
            }
            /* eslint-enable no-fallthrough */
            case 'VariableDeclaration': {
              for (const d of n.declaration.declarations) {
                recursivePatternCapture(d.id, id =>
                  m.namespace.set(
                    (id as TSESTree.Identifier).name,
                    captureDoc(source, docStyleParsers, d, n),
                  ),
                )
              }
              break
            }
            default:
          }
        }

        for (const s of n.specifiers) processSpecifier(s, n, m)
      }

      const exports = ['TSExportAssignment']
      if (isEsModuleInteropTrue) {
        exports.push('TSNamespaceExportDeclaration')
      }

      // This doesn't declare anything, but changes what's being exported.
      if (exports.includes(n.type)) {
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
        const exportedDecls = ast.body.filter(node => {
          return (
            declTypes.has(node.type) &&
            (('id' in node &&
              node.id &&
              'name' in node.id &&
              node.id.name === exportedName) ||
              ('declarations' in node &&
                node.declarations.find(
                  d => 'name' in d.id && d.id.name === exportedName,
                )))
          )
        })
        if (exportedDecls.length === 0) {
          // Export is not referencing any local declaration, must be re-exporting
          m.namespace.set('default', captureDoc(source, docStyleParsers, n))
          continue
        }
        if (
          isEsModuleInteropTrue && // esModuleInterop is on in tsconfig
          !m.namespace.has('default') // and default isn't added already
        ) {
          m.namespace.set('default', {}) // add default export
        }
        for (const decl of exportedDecls) {
          if (decl.type === 'TSModuleDeclaration') {
            if (decl.body && decl.body.type === 'TSModuleDeclaration') {
              m.namespace.set(
                (decl.body.id as TSESTree.Identifier).name,
                captureDoc(source, docStyleParsers, decl.body),
              )
            } else if (decl.body && decl.body.body) {
              for (const moduleBlockNode of decl.body.body) {
                // Export-assignment exports all members in the namespace,
                // explicitly exported or not.
                const namespaceDecl =
                  moduleBlockNode.type === 'ExportNamedDeclaration'
                    ? moduleBlockNode.declaration
                    : moduleBlockNode

                if (!namespaceDecl) {
                  // TypeScript can check this for us; we needn't
                } else if (namespaceDecl.type === 'VariableDeclaration') {
                  for (const d of namespaceDecl.declarations)
                    recursivePatternCapture(d.id, id =>
                      m.namespace.set(
                        (id as TSESTree.Identifier).name,
                        captureDoc(
                          source,
                          docStyleParsers,
                          decl,
                          namespaceDecl,
                          moduleBlockNode,
                        ),
                      ),
                    )
                } else if ('id' in namespaceDecl) {
                  m.namespace.set(
                    (namespaceDecl.id as TSESTree.Identifier).name,
                    captureDoc(source, docStyleParsers, moduleBlockNode),
                  )
                }
              }
            }
          } else {
            // Export as default
            m.namespace.set(
              'default',
              captureDoc(source, docStyleParsers, decl),
            )
          }
        }
      }
    }

    if (
      isEsModuleInteropTrue && // esModuleInterop is on in tsconfig
      m.namespace.size > 0 && // anything is exported
      !m.namespace.has('default') // and default isn't added already
    ) {
      m.namespace.set('default', {}) // add default export
    }

    if (unambiguouslyESM) {
      m.parseGoal = 'Module'
    }
    return m
  }

  namespace = new Map<string, ModuleNamespace>()

  // todo: restructure to key on path, value is resolver + map of names
  reexports = new Map<
    string,
    {
      local: string
      getImport(): ExportMap | null
    }
  >()

  /**
   * star-exports
   */
  dependencies = new Set<() => ExportMap | null>()

  /**
   * dependencies of this module that are not explicitly re-exported
   */
  imports = new Map<string, ModuleImport>()

  errors: ParseError[] = []

  parseGoal: 'ambiguous' | 'Module' | 'Script' = 'ambiguous'

  declare visitorKeys: TSESLint.SourceCode.VisitorKeys | null

  private declare mtime: Date

  declare doc: Annotation

  constructor(public path: string) {}

  get hasDefault() {
    return this.get('default') != null
  } // stronger than this.has

  get size() {
    let size = this.namespace.size + this.reexports.size
    for (const dep of this.dependencies) {
      const d = dep()
      // CJS / ignored dependencies won't exist (#717)
      if (d == null) {
        continue
      }
      size += d.size
    }
    return size
  }

  /**
   * Note that this does not check explicitly re-exported names for existence
   * in the base namespace, but it will expand all `export * from '...'` exports
   * if not found in the explicit namespace.
   * @return true if `name` is exported by this module.
   */
  has(name: string): boolean {
    if (this.namespace.has(name)) {
      return true
    }
    if (this.reexports.has(name)) {
      return true
    }

    // default exports must be explicitly re-exported (#328)
    if (name !== 'default') {
      for (const dep of this.dependencies) {
        const innerMap = dep()

        // todo: report as unresolved?
        if (!innerMap) {
          continue
        }

        if (innerMap.has(name)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * ensure that imported name fully resolves.
   */
  hasDeep(name: string): { found: boolean; path: ExportMap[] } {
    if (this.namespace.has(name)) {
      return { found: true, path: [this] }
    }

    if (this.reexports.has(name)) {
      const reexports = this.reexports.get(name)!
      const imported = reexports.getImport()

      // if import is ignored, return explicit 'null'
      if (imported == null) {
        return { found: true, path: [this] }
      }

      // safeguard against cycles, only if name matches
      if (imported.path === this.path && reexports.local === name) {
        return { found: false, path: [this] }
      }

      const deep = imported.hasDeep(reexports.local)
      deep.path.unshift(this)

      return deep
    }

    // default exports must be explicitly re-exported (#328)
    if (name !== 'default') {
      for (const dep of this.dependencies) {
        const innerMap = dep()
        if (innerMap == null) {
          return { found: true, path: [this] }
        }
        // todo: report as unresolved?
        if (!innerMap) {
          continue
        }

        // safeguard against cycles
        if (innerMap.path === this.path) {
          continue
        }

        const innerValue = innerMap.hasDeep(name)
        if (innerValue.found) {
          innerValue.path.unshift(this)
          return innerValue
        }
      }
    }

    return { found: false, path: [this] }
  }

  get(name: string): ModuleNamespace | null | undefined {
    if (this.namespace.has(name)) {
      return this.namespace.get(name)
    }

    if (this.reexports.has(name)) {
      const reexports = this.reexports.get(name)!
      const imported = reexports.getImport()

      // if import is ignored, return explicit 'null'
      if (imported == null) {
        return null
      }

      // safeguard against cycles, only if name matches
      if (imported.path === this.path && reexports.local === name) {
        return undefined
      }

      return imported.get(reexports.local)
    }

    // default exports must be explicitly re-exported (#328)
    if (name !== 'default') {
      for (const dep of this.dependencies) {
        const innerMap = dep()
        // todo: report as unresolved?
        if (!innerMap) {
          continue
        }

        // safeguard against cycles
        if (innerMap.path === this.path) {
          continue
        }

        const innerValue = innerMap.get(name)
        if (innerValue !== undefined) {
          return innerValue
        }
      }
    }
  }

  forEach(
    callback: (
      value: ModuleNamespace | null | undefined,
      name: string,
      map: ExportMap,
    ) => void,
    thisArg?: unknown,
  ) {
    for (const [n, v] of this.namespace.entries()) {
      callback.call(thisArg, v, n, this)
    }

    for (const [name, reexports] of this.reexports.entries()) {
      const reexported = reexports.getImport()
      // can't look up meta for ignored re-exports (#348)
      callback.call(thisArg, reexported?.get(reexports.local), name, this)
    }

    // eslint-disable-next-line unicorn/no-array-for-each
    this.dependencies.forEach(dep => {
      const d = dep()
      // CJS / ignored dependencies won't exist (#717)
      if (d == null) {
        return
      }

      // eslint-disable-next-line unicorn/no-array-for-each
      d.forEach((v, n) => {
        if (n !== 'default') {
          callback.call(thisArg, v, n, this)
        }
      })
    })
  }

  // todo: keys, values, entries?

  reportErrors(
    context: RuleContext,
    declaration: { source: TSESTree.Literal | null },
  ) {
    if (!declaration.source) {
      throw new Error('declaration.source is null')
    }
    const msg = this.errors
      .map(err => `${err.message} (${err.lineNumber}:${err.column})`)
      .join(', ')
    context.report({
      node: declaration.source,
      // @ts-expect-error - report without messageId
      message: `Parse errors in imported module '${declaration.source.value}': ${msg}`,
    })
  }
}

/**
 * parse docs from the first node that has leading comments
 */
function captureDoc(
  source: SourceCode,
  docStyleParsers: DocStyleParsers,
  ...nodes: TSESTree.Node[]
) {
  const metadata: {
    doc?: Annotation
  } = {}

  // 'some' short-circuits on first 'true'
  nodes.some(n => {
    try {
      let leadingComments: TSESTree.Comment[] | undefined

      // n.leadingComments is legacy `attachComments` behavior
      if ('leadingComments' in n && Array.isArray(n.leadingComments)) {
        leadingComments = n.leadingComments as TSESTree.Comment[]
      } else if (n.range) {
        leadingComments = (
          source as unknown as TSESLint.SourceCode
        ).getCommentsBefore(n)
      }

      if (!leadingComments || leadingComments.length === 0) {
        return false
      }

      for (const parser of Object.values(docStyleParsers)) {
        const doc = parser(leadingComments)
        if (doc) {
          metadata.doc = doc
        }
      }

      return true
    } catch {
      return false
    }
  })

  return metadata
}

const availableDocStyleParsers = {
  jsdoc: captureJsDoc,
  tomdoc: captureTomDoc,
}

/**
 * parse JSDoc from leading comments
 */
function captureJsDoc(comments: TSESTree.Comment[]) {
  let doc: Annotation | undefined

  // capture XSDoc
  for (const comment of comments) {
    // skip non-block comments
    if (comment.type !== 'Block') {
      continue
    }
    try {
      doc = doctrine.parse(comment.value, { unwrap: true })
    } catch {
      /* don't care, for now? maybe add to `errors?` */
    }
  }

  return doc
}

/**
 * parse TomDoc section from comments
 */
function captureTomDoc(comments: TSESTree.Comment[]): Annotation | undefined {
  // collect lines up to first paragraph break
  const lines = []
  for (const comment of comments) {
    if (/^\s*$/.test(comment.value)) {
      break
    }
    lines.push(comment.value.trim())
  }

  // return doctrine-like object
  const statusMatch = lines
    .join(' ')
    .match(/^(Public|Internal|Deprecated):\s*(.+)/)
  if (statusMatch) {
    return {
      description: statusMatch[2],
      tags: [
        {
          title: statusMatch[1].toLowerCase(),
          description: statusMatch[2],
        },
      ],
    }
  }
}

const supportedImportTypes = new Set([
  'ImportDefaultSpecifier',
  'ImportNamespaceSpecifier',
])

/**
 * The creation of this closure is isolated from other scopes
 * to avoid over-retention of unrelated variables, which has
 * caused memory leaks. See #1266.
 */
function thunkFor(p: string, context: RuleContext | ChildContext) {
  return () => ExportMap.for(childContext(p, context))
}

/**
 * Traverse a pattern/identifier node, calling 'callback'
 * for each leaf identifier.
 */
export function recursivePatternCapture(
  pattern: TSESTree.Node,
  callback: (node: TSESTree.DestructuringPattern) => void,
) {
  switch (pattern.type) {
    case 'Identifier': {
      // base case
      callback(pattern)
      break
    }
    case 'ObjectPattern': {
      for (const p of pattern.properties) {
        if (
          // @ts-expect-error - legacy experimental
          p.type === 'ExperimentalRestProperty' ||
          p.type === 'RestElement'
        ) {
          callback(p.argument)
          continue
        }
        recursivePatternCapture(p.value, callback)
      }
      break
    }
    case 'ArrayPattern': {
      for (const element of pattern.elements) {
        if (element == null) {
          continue
        }
        if (
          // @ts-expect-error - legacy experimental
          element.type === 'ExperimentalRestProperty' ||
          element.type === 'RestElement'
        ) {
          callback(element.argument)
          continue
        }
        recursivePatternCapture(element, callback)
      }
      break
    }
    case 'AssignmentPattern': {
      callback(pattern.left)
      break
    }
    default:
  }
}

let parserOptionsHash = ''
let prevParserOptions = ''
let settingsHash = ''
let prevSettings = ''

/**
 * don't hold full context object in memory, just grab what we need.
 * also calculate a cacheKey, where parts of the cacheKey hash are memoized
 */
function childContext(
  path: string,
  context: RuleContext | ChildContext,
): ChildContext {
  const { settings, parserOptions, parserPath } = context

  if (JSON.stringify(settings) !== prevSettings) {
    settingsHash = hashObject({ settings }).digest('hex')
    prevSettings = JSON.stringify(settings)
  }

  if (JSON.stringify(parserOptions) !== prevParserOptions) {
    parserOptionsHash = hashObject({ parserOptions }).digest('hex')
    prevParserOptions = JSON.stringify(parserOptions)
  }

  return {
    cacheKey:
      String(parserPath) + parserOptionsHash + settingsHash + String(path),
    settings,
    parserOptions,
    parserPath,
    path,
    filename:
      'getPhysicalFilename' in context &&
      typeof context.getPhysicalFilename === 'function'
        ? context.getPhysicalFilename()
        : 'physicalFilename' in context && context.physicalFilename != null
          ? (context.physicalFilename as string)
          : 'getFilename' in context &&
              typeof context.getFilename === 'function'
            ? context.getFilename()
            : ('filename' in context && context.filename) || undefined,
  }
}

/**
 * sometimes legacy support isn't _that_ hard... right?
 */
function makeSourceCode(text: string, ast: TSESTree.Program) {
  if (SourceCode.length > 1) {
    // ESLint 3
    return new SourceCode(text, ast as AST.Program)
  }

  // ESLint 4+
  return new SourceCode({ text, ast: ast as AST.Program })
}
