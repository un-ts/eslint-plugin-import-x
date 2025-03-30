import fs from 'node:fs'
import path from 'node:path'

import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import debug from 'debug'
import type { Annotation } from 'doctrine'
import * as doctrine from 'doctrine'
import type { AST } from 'eslint'
import { SourceCode } from 'eslint'
import type { TsConfigJsonResolved, TsConfigResult } from 'get-tsconfig'
import { getTsconfig } from 'get-tsconfig'
import { stableHash } from 'stable-hash'

import type {
  ChildContext,
  DocStyle,
  ExportDefaultSpecifier,
  ExportNamespaceSpecifier,
  ParseError,
  RuleContext,
} from '../types.js'

import { getValue } from './get-value.js'
import { hasValidExtension, ignore } from './ignore.js'
import { lazy, defineLazyProperty } from './lazy-value.js'
import { parse } from './parse.js'
import { relative, resolve } from './resolve.js'
import { isMaybeUnambiguousModule, isUnambiguousModule } from './unambiguous.js'
import { visit } from './visit.js'

const log = debug('eslint-plugin-import-x:ExportMap')

const exportCache = new Map<string, ExportMap | null>()

const tsconfigCache = new Map<string, TsConfigJsonResolved | null | undefined>()

export type DocStyleParsers = Record<
  DocStyle,
  (comments: TSESTree.Comment[]) => Annotation | undefined
>

export interface DeclarationMetadata {
  source: Pick<TSESTree.Literal, 'value' | 'loc'>
  importedSpecifiers?: Set<string>
  dynamic?: boolean
  isOnlyImportingTypes?: boolean
}

export interface ModuleNamespace {
  doc?: Annotation
  namespace?: ExportMap | null
}

export interface ModuleImport {
  getter: () => ExportMap | null
  declarations: Set<DeclarationMetadata>
}

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

export class ExportMap {
  static for(context: ChildContext) {
    const filepath = context.path
    const cacheKey = context.cacheKey
    let exportMap = exportCache.get(cacheKey)

    const stats = lazy(() => fs.statSync(filepath))

    if (exportCache.has(cacheKey)) {
      const exportMap = exportCache.get(cacheKey)

      // return cached ignore
      if (exportMap === null) {
        return null
      }

      // check if the file has been modified since cached exportmap generation
      if (
        exportMap != null &&
        exportMap.mtime - stats().mtime.valueOf() === 0
      ) {
        return exportMap
      }

      // future: check content equality?
    }

    // check valid extensions first
    if (!hasValidExtension(filepath, context)) {
      exportCache.set(cacheKey, null)
      return null
    }

    // check for and cache ignore
    if (ignore(filepath, context, true)) {
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
    if (exportMap === null) {
      log('ignored path due to ambiguous parse:', filepath)
      exportCache.set(cacheKey, null)
      return null
    }

    exportMap.mtime = stats().mtime.valueOf()

    // If the visitor keys were not populated, then we shouldn't save anything to the cache,
    // since the parse results may not be reliable.
    if (exportMap.visitorKeys) {
      exportCache.set(cacheKey, exportMap)
    }

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
    const isEsModuleInteropTrue = lazy(isEsModuleInterop)

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

    const unambiguouslyESM = lazy(() => isUnambiguousModule(ast))

    if (!hasDynamicImports && !unambiguouslyESM()) {
      return null
    }

    const docStyles = (context.settings &&
      context.settings['import-x/docstyle']) || ['jsdoc']

    const docStyleParsers = {} as DocStyleParsers

    for (const style of docStyles) {
      docStyleParsers[style] = availableDocStyleParsers[style]
    }

    const namespaces = new Map</* identifier */ string, /* source */ string>()

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

    function getNamespace(namespace: string) {
      if (!namespaces.has(namespace)) {
        return
      }

      return function () {
        return resolveImport(namespaces.get(namespace)!)
      }
    }

    function addNamespace(
      object: object,
      identifier: TSESTree.Identifier | TSESTree.StringLiteral,
    ) {
      const nsfn = getNamespace(getValue(identifier))
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
          m.exports.set(s.exported.name, n)
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
          m.exports.set(getValue(s.exported!), n)
          m.namespace.set(
            getValue(s.exported!),
            addNamespace(exportMeta, s.exported!),
          )

          return
        }
        case 'ExportSpecifier': {
          if (!('source' in n && n.source)) {
            m.exports.set(getValue(s.exported!), n)
            m.namespace.set(
              getValue(s.exported),
              addNamespace(exportMeta, s.local),
            )
            return
          }
        }
        // else falls through
        default: {
          if ('local' in s) {
            local = getValue(s.local)
          } else {
            throw new Error('Unknown export specifier type')
          }
          break
        }
      }

      if ('exported' in s) {
        // todo: JSDoc
        m.reexports.set(getValue(s.exported), {
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
          importedSpecifiers.add(getValue(specifier.imported))
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

    const source = new SourceCode({ text: content, ast: ast as AST.Program })

    function isEsModuleInterop() {
      const parserOptions = context.parserOptions || {}
      let tsconfigRootDir = parserOptions.tsconfigRootDir
      const project = parserOptions.project
      const cacheKey = stableHash({ tsconfigRootDir, project })
      let tsConfig: TsConfigJsonResolved | null | undefined

      if (tsconfigCache.has(cacheKey)) {
        tsConfig = tsconfigCache.get(cacheKey)!
      } else {
        tsconfigRootDir = tsconfigRootDir || process.cwd()
        let tsconfigResult: TsConfigResult | null | undefined
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
        tsConfig = tsconfigResult?.config
        tsconfigCache.set(cacheKey, tsConfig)
      }

      return tsConfig?.compilerOptions?.esModuleInterop ?? false
    }

    for (const n of ast.body) {
      if (n.type === 'ExportDefaultDeclaration') {
        const exportMeta = captureDoc(source, docStyleParsers, n)
        if (n.declaration.type === 'Identifier') {
          addNamespace(exportMeta, n.declaration)
        }
        m.exports.set('default', n)
        m.namespace.set('default', exportMeta)
        continue
      }

      if (n.type === 'ExportAllDeclaration') {
        if (n.exported) {
          namespaces.set(n.exported.name, n.source.value)
          processSpecifier(n, n.exported, m)
        } else {
          const getter = captureDependency(n, n.exportKind === 'type')
          if (getter) {
            m.dependencies.add(getter)
          }
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
              m.exports.set((n.declaration.id as TSESTree.Identifier).name, n)
              m.namespace.set(
                (n.declaration.id as TSESTree.Identifier).name,
                captureDoc(source, docStyleParsers, n),
              )
              break
            }
            /* eslint-enable no-fallthrough */
            case 'VariableDeclaration': {
              for (const d of n.declaration.declarations) {
                recursivePatternCapture(d.id, id => {
                  m.exports.set((id as TSESTree.Identifier).name, n)
                  m.namespace.set(
                    (id as TSESTree.Identifier).name,
                    captureDoc(source, docStyleParsers, d, n),
                  )
                })
              }
              break
            }
            default:
          }
        }

        for (const s of n.specifiers) {
          processSpecifier(s, n, m)
        }
      }

      const exports = ['TSExportAssignment']
      if (isEsModuleInteropTrue()) {
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

        const getRoot = (
          node: TSESTree.TSQualifiedName,
        ): TSESTree.Identifier => {
          if (node.left.type === 'TSQualifiedName') {
            return getRoot(node.left)
          }
          return node.left as TSESTree.Identifier
        }

        const exportedDecls = ast.body.filter(node => {
          return (
            declTypes.has(node.type) &&
            (('id' in node &&
              node.id &&
              ('name' in node.id
                ? node.id.name === exportedName
                : 'left' in node.id &&
                  getRoot(node.id).name === exportedName)) ||
              ('declarations' in node &&
                node.declarations.find(
                  d => 'name' in d.id && d.id.name === exportedName,
                )))
          )
        })

        if (exportedDecls.length === 0) {
          m.exports.set('default', n)
          // Export is not referencing any local declaration, must be re-exporting
          m.namespace.set('default', captureDoc(source, docStyleParsers, n))
          continue
        }

        if (
          isEsModuleInteropTrue() && // esModuleInterop is on in tsconfig
          !m.namespace.has('default') // and default isn't added already
        ) {
          m.exports.set('default', n)
          m.namespace.set('default', {}) // add default export
        }

        for (const decl of exportedDecls) {
          if (decl.type === 'TSModuleDeclaration') {
            const type = decl.body?.type

            // @ts-expect-error - legacy parser type
            if (type === 'TSModuleDeclaration') {
              // @ts-expect-error - legacy parser type
              m.exports.set((decl.body.id as TSESTree.Identifier).name, n)
              m.namespace.set(
                // @ts-expect-error - legacy parser type
                (decl.body.id as TSESTree.Identifier).name,
                captureDoc(source, docStyleParsers, decl.body),
              )
              continue
            } else if (type === 'TSModuleBlock' && decl.kind === 'namespace') {
              const metadata = captureDoc(source, docStyleParsers, decl.body)
              if ('name' in decl.id) {
                m.namespace.set(decl.id.name, metadata)
              } else {
                // TODO: handle left TSQualifiedName: `declare module foo.bar.baz`
                m.namespace.set(decl.id.right.name, metadata)
              }
            }

            if (decl.body?.body) {
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
                    recursivePatternCapture(d.id, id => {
                      m.exports.set((id as TSESTree.Identifier).name, n)
                      m.namespace.set(
                        (id as TSESTree.Identifier).name,
                        captureDoc(
                          source,
                          docStyleParsers,
                          decl,
                          namespaceDecl,
                          moduleBlockNode,
                        ),
                      )
                    })
                } else if ('id' in namespaceDecl) {
                  m.exports.set(
                    (namespaceDecl.id as TSESTree.Identifier).name,
                    n,
                  )
                  m.namespace.set(
                    (namespaceDecl.id as TSESTree.Identifier).name,
                    captureDoc(source, docStyleParsers, moduleBlockNode),
                  )
                }
              }
            }
          } else {
            // Export as default
            m.exports.set('default', n)
            m.namespace.set(
              'default',
              captureDoc(source, docStyleParsers, decl),
            )
          }
        }
      }
    }

    // attempt to collect module doc
    defineLazyProperty(m, 'doc', () => {
      if (ast.comments) {
        for (let i = 0, len = ast.comments.length; i < len; i++) {
          const c = ast.comments[i]
          if (c.type !== 'Block') {
            continue
          }
          try {
            const doc = doctrine.parse(c.value, { unwrap: true })
            if (doc.tags.some(t => t.title === 'module')) {
              return doc
            }
          } catch {
            /* ignore */
          }
        }
      }
    })

    if (
      isEsModuleInteropTrue() && // esModuleInterop is on in tsconfig
      m.namespace.size > 0 && // anything is exported
      !m.namespace.has('default') // and default isn't added already
    ) {
      m.exports.set('default', ast.body[0]) // add default export
      m.namespace.set('default', {}) // add default export
    }

    const prevParseGoal = m.parseGoal
    defineLazyProperty(m, 'parseGoal', () => {
      if (prevParseGoal !== 'Module' && unambiguouslyESM()) {
        return 'Module'
      }
      return prevParseGoal
    })

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
  exports = new Map<string, TSESTree.Identifier | TSESTree.ProgramStatement>()

  errors: ParseError[] = []

  parseGoal: 'ambiguous' | 'Module' | 'Script' = 'ambiguous'

  declare visitorKeys: TSESLint.SourceCode.VisitorKeys | null

  declare private mtime: number

  declare doc: Annotation | undefined

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

  // FIXME: `forEach` will be transformed into `.entries()`, WTF?!
  $forEach(
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

      d.$forEach((v, n) => {
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
  ...nodes: Array<TSESTree.Node | undefined>
) {
  const metadata: {
    doc?: Annotation | undefined
  } = {}

  defineLazyProperty(metadata, 'doc', () => {
    for (let i = 0, len = nodes.length; i < len; i++) {
      const n = nodes[i]
      if (!n) {
        continue
      }

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
          continue
        }

        for (const parser of Object.values(docStyleParsers)) {
          const doc = parser(leadingComments)
          if (doc) {
            return doc
          }
        }

        return
      } catch {
        continue
      }
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
  // capture XSDoc

  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]
    // skip non-block comments
    if (comment.type !== 'Block') {
      continue
    }
    try {
      return doctrine.parse(comment.value, { unwrap: true })
    } catch {
      /* don't care, for now? maybe add to `errors?` */
    }
  }
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

/**
 * don't hold full context object in memory, just grab what we need.
 * also calculate a cacheKey, where parts of the cacheKey hash are memoized
 */
function childContext(
  path: string,
  context: RuleContext | ChildContext,
): ChildContext {
  const { settings, parserOptions, parserPath, languageOptions } = context

  return {
    cacheKey: makeContextCacheKey(context) + path,
    settings,
    parserOptions,
    parserPath,
    languageOptions,
    path,
    filename:
      'physicalFilename' in context
        ? context.physicalFilename
        : context.filename,
  }
}

function makeContextCacheKey(context: RuleContext | ChildContext) {
  const { settings, parserPath, parserOptions, languageOptions } = context

  let hash =
    stableHash(settings) +
    stableHash(languageOptions?.parserOptions ?? parserOptions)

  if (languageOptions) {
    hash +=
      String(languageOptions.ecmaVersion) + String(languageOptions.sourceType)
  }

  hash += stableHash(
    parserPath ?? languageOptions?.parser?.meta ?? languageOptions?.parser,
  )

  return hash
}
