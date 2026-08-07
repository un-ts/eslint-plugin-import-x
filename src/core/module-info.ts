/**
 * @file `ModuleInfo` — the module analysis core: rules talk to it and to
 *   nothing else for module analysis. It is lexer-based (plain-JS modules
 *   under `node_modules` need no parser; see `module-lexer.ts`) and falls
 *   back to parsing with the configured ESLint parser and walking the AST
 *   itself (see `ast-module.ts`). Queries needed by a single rule are
 *   standalone functions in `module-exports.ts`/`module-doc.ts` instead of
 *   members here.
 */

import fs from 'node:fs'

import type { TSESTree } from '@typescript-eslint/utils'
import debug from 'debug'
import { getTsconfigWithContext } from 'eslint-import-context'

import type { ChildContext, ParseError, RuleContext } from '../types.js'
import { childContext } from '../utils/child-context.js'
import { hasValidExtension, ignore } from '../utils/ignore.js'
import { relative, resolve } from '../utils/resolve.js'
import { isMaybeUnambiguousModule } from '../utils/unambiguous.js'

import type { AstModuleFacts, DefaultExportSourceName } from './ast-module.js'
import { analyzeAstModule } from './ast-module.js'
import type { DocCommentBlock } from './module-doc.js'
import { hasDeprecationMarker } from './module-doc.js'
import type { LexedEsModule } from './module-lexer.js'
import { LEXABLE_EXTENSIONS_PATTERN, lexModule } from './module-lexer.js'
import { hasAnyExports, hasExport, lookupExport } from './resolve-exports.js'

const log = debug('eslint-plugin-import-x:core:module-info')

/** A path segment named `node_modules` marks third-party code. */
const NODE_MODULES_PATTERN = /[/\\]node_modules[/\\]/

/**
 * Whether the lexers can analyze the file: plain JavaScript living under a
 * `node_modules` directory. Project-internal modules (and anything the
 * lexers can't handle: TS, JSX, Flow, custom parsers) go through the
 * AST-parse route.
 */
function isLexableExternalModule(filepath: string) {
  return (
    LEXABLE_EXTENSIONS_PATTERN.test(filepath) &&
    NODE_MODULES_PATTERN.test(filepath)
  )
}

/**
 * Per-declaration metadata of an import found in a module. AST-free: only
 * the source literal value/loc and a few flags survive analysis.
 */
export interface ModuleImportDeclaration {
  source: Pick<TSESTree.Literal, 'value' | 'loc'>
  /**
   * What the declaration imports from the target. Absent when the analysis
   * did not determine bindings — the lexer route reports module links but
   * not what each statement binds, so consumers must treat `undefined` as
   * "unknown", never as "imports nothing".
   */
  imported?: {
    names: ReadonlySet<string>
    default: boolean
    namespace: boolean
  }
  dynamic?: boolean
  isOnlyImportingTypes?: boolean
}

/** One name exported by a module's own code. */
export interface ExportMeta {
  /**
   * Present when the export is a namespace object (`export * as ns from`,
   * or a re-exported namespace import): lazily resolves the module the
   * namespace refers to. `null` when the target is unanalyzable.
   */
  getNamespace?: () => ModuleInfo | null
  /**
   * @internal Lazily parse the doc comment block at the declaration site.
   *   Only produced by the AST route; consumed via `module-doc.ts`.
   */
  getDoc?: () => DocCommentBlock | undefined
  /**
   * The name is only inferred from TS `export =` namespace analysis, not
   * written in an explicit export statement.
   */
  inferred?: boolean
}

/** One `export { local as exported } from '...'` record. */
export interface ModuleReexportRecord {
  local: string
  /** Lazily analyze the source module; `null` when unanalyzable. */
  resolveTarget: () => ModuleInfo | null
}

/**
 * One imported module (keyed by resolved path) and how it is imported. The
 * declarations are plain edge data; `resolve()` is kept separable so graph
 * algorithms can work on paths alone (a future core `ModuleGraph` will build
 * on this without another rule rewrite).
 */
export interface ModuleInfoImport {
  resolve(): ModuleInfo | null
  declarations: ReadonlySet<ModuleImportDeclaration>
}

interface CacheEntry {
  /**
   * The file mtime the result was derived from, or `null` when the result
   * does not depend on file content at all (it follows from settings, which
   * are part of the cache key) and therefore never needs revalidating.
   */
  mtime: number | null
  value: ModuleInfo | null
}

const moduleInfoCache = new Map<string, CacheEntry>()

/**
 * The module analysis core — what a rule may ask about another module, and
 * the only thing rules talk to.
 *
 * A `ModuleInfo` is lexer-based: for plain-JS modules under `node_modules`
 * it extracts its data with `es-module-lexer`/`cjs-module-lexer` and no
 * parser ever runs. Everything else (project-internal modules, TS, JSX,
 * Flow, custom parsers, files the lexers reject) falls back to the AST
 * route: the file is parsed with the configured ESLint parser and its AST
 * walked once (`ast-module.ts`), producing the same fields. All
 * cross-module links resolve `ModuleInfo → ModuleInfo` by re-entering
 * {@link ModuleInfo.for}.
 *
 * Contract: accessing a member may trigger computation; results are cached
 * for the lifetime of the instance, and instances are cached per
 * settings-context and invalidated by file mtime — including negative
 * results, so a file that becomes analyzable is picked up.
 *
 * This class carries only the queries shared by several rules. Everything
 * needed by a single rule is a standalone function instead (see
 * `module-exports.ts` and `module-doc.ts`) — each rule declares what it
 * depends on by importing it.
 */
export class ModuleInfo {
  /**
   * Resolve `source` (an import specifier appearing in the file being linted)
   * and analyze the target module.
   *
   * @returns `null` when the target cannot be resolved, is ignored, or is not
   *   unambiguously a module.
   */
  static get(source: string, context: RuleContext): ModuleInfo | null {
    const path = resolve(source, context)
    if (path == null) {
      return null
    }
    return ModuleInfo.for(childContext(path, context))
  }

  /** Analyze (or return the cached analysis of) the module at `context.path`. */
  static for(context: ChildContext): ModuleInfo | null {
    const filepath = context.path
    const cacheKey = context.cacheKey

    let mtime: number | undefined
    const statMtime = () => {
      if (mtime === undefined) {
        try {
          mtime = fs.statSync(filepath).mtime.valueOf()
        } catch {
          // unreadable — treated as unanalyzable below
        }
      }
      return mtime
    }

    const cached = moduleInfoCache.get(cacheKey)
    if (cached && (cached.mtime === null || cached.mtime === statMtime())) {
      return cached.value
    }

    /**
     * Cache a content-derived result — including a negative one, so a file
     * that becomes analyzable (CommonJS rewritten as ESM, a syntax error
     * fixed) is picked up on its next mtime change instead of staying
     * unanalyzable for the life of the process. Skipped when the file
     * cannot be stat'd, since there is nothing to revalidate against.
     */
    const remember = (value: ModuleInfo | null) => {
      const stamp = statMtime()
      if (stamp !== undefined) {
        moduleInfoCache.set(cacheKey, { mtime: stamp, value })
      }
      return value
    }

    if (
      !hasValidExtension(filepath, context) ||
      ignore(filepath, context, true)
    ) {
      // settings-derived, and settings are part of the cache key
      moduleInfoCache.set(cacheKey, { mtime: null, value: null })
      return null
    }

    let content: string
    try {
      content = fs.readFileSync(filepath, { encoding: 'utf8' })
    } catch {
      // the file vanished (or became unreadable) between resolution and
      // analysis — unanalyzable, and not cached: the failure may be transient
      return null
    }

    if (isLexableExternalModule(filepath)) {
      const lexed = lexModule(content, filepath)
      if (lexed != null) {
        if (lexed.format === 'script') {
          // CommonJS is unanalyzable to rules — same as the AST route below
          log('lexed as non-module script:', filepath)
          return remember(null)
        }
        log('lexed external module:', filepath)
        const info = ModuleInfo.fromFacts(
          filepath,
          context,
          ModuleInfo.lexedToFacts(filepath, context, lexed),
          false,
        )
        info.maybeHasDeprecationDoc = hasDeprecationMarker(
          content,
          context.settings,
        )
        return remember(info)
      }
      // the lexers could not handle the file — fall back to the AST route
      log('lexer fallback to AST parse:', filepath)
    }

    // cheap prefilter: don't parse large CJS files that can't be modules
    if (!isMaybeUnambiguousModule(content)) {
      log('ignored path due to unambiguous regex:', filepath)
      return remember(null)
    }

    // Decided before parsing: a module with no deprecation marker can never
    // answer a doc query, so the analysis must not build the doc getters that
    // would pin its AST in this cache — nor ask the parser for the comments
    // and tokens they need. See `needDocs` on `analyzeAstModule`.
    const maybeHasDeprecationDoc = hasDeprecationMarker(
      content,
      context.settings,
    )

    const facts = analyzeAstModule(
      filepath,
      content,
      context,
      maybeHasDeprecationDoc,
    )
    if (facts == null) {
      log('ignored path due to ambiguous parse:', filepath)
      return remember(null)
    }

    const info = ModuleInfo.fromFacts(filepath, context, facts, true)
    info.maybeHasDeprecationDoc = maybeHasDeprecationDoc
    // an unreliable parse (no visitor keys) must not be cached
    return facts.cacheable ? remember(info) : info
  }

  /** Normalize lexer output to the facts shape the AST route produces. */
  private static lexedToFacts(
    filepath: string,
    context: ChildContext,
    lexed: LexedEsModule,
  ): AstModuleFacts {
    const resolvePath = (specifier: string) =>
      relative(specifier, filepath, context.settings, context) ?? null

    const ownExports: AstModuleFacts['ownExports'] = new Map()
    for (const name of lexed.ownExports) {
      ownExports.set(name, {})
    }
    for (const { exported, specifier } of lexed.namespaceReexports) {
      ownExports.set(exported, { namespaceTargetPath: resolvePath(specifier) })
    }

    const reexports = new Map<
      string,
      { local: string; targetPath: string | null }
    >()
    for (const { exported, local, specifier } of lexed.reexports) {
      reexports.set(exported, { local, targetPath: resolvePath(specifier) })
    }

    const imports = new Map<string, ModuleImportDeclaration[]>()
    const starExportPaths: string[] = []
    for (const imp of lexed.imports) {
      const p = resolvePath(imp.specifier)
      if (p == null) {
        continue
      }
      const declaration: ModuleImportDeclaration = {
        source: { value: imp.specifier, loc: imp.loc },
        isOnlyImportingTypes: false,
        ...(imp.dynamic && { dynamic: true }),
      }
      const list = imports.get(p)
      if (list) {
        list.push(declaration)
      } else {
        imports.set(p, [declaration])
      }
      if (imp.starReexport) {
        starExportPaths.push(p)
      }
    }

    // the AST walk synthesizes this itself; mirror it for lexed modules
    if (
      ownExports.size > 0 &&
      !ownExports.has('default') &&
      (getTsconfigWithContext(context)?.compilerOptions?.esModuleInterop ??
        false)
    ) {
      ownExports.set('default', {})
    }

    return {
      format: lexed.format === 'module' ? 'Module' : 'ambiguous',
      parseError: undefined,
      cacheable: true,
      ownExports,
      reexports,
      starExportPaths,
      imports,
      defaultExportSourceName: lexed.defaultExportSourceName,
    }
  }

  /** Populate from extracted facts — the single factory for both routes. */
  private static fromFacts(
    filepath: string,
    context: ChildContext,
    facts: AstModuleFacts,
    builtFromAst: boolean,
  ): ModuleInfo {
    const info = new ModuleInfo(
      filepath,
      context,
      facts.format,
      facts.parseError,
    )
    info.builtFromAst = builtFromAst
    info.moduleDocGetter = facts.getModuleDoc
    info.defaultExportSourceName = facts.defaultExportSourceName

    for (const [name, own] of facts.ownExports) {
      const targetPath = own.namespaceTargetPath
      info.ownExports.set(name, {
        ...(own.getDoc && { getDoc: own.getDoc }),
        ...(own.inferred && { inferred: true }),
        ...(targetPath !== undefined && {
          getNamespace: () =>
            targetPath == null ? null : info.resolvePath(targetPath),
        }),
      })
    }

    for (const [name, { local, targetPath }] of facts.reexports) {
      info.reexports.set(name, {
        local,
        resolveTarget: () =>
          targetPath == null ? null : info.resolvePath(targetPath),
      })
    }

    for (const p of facts.starExportPaths) {
      info.starExports.push(() => info.resolvePath(p))
    }

    for (const [p, declarations] of facts.imports) {
      info.imports.set(p, {
        resolve: () => info.resolvePath(p),
        declarations: new Set(declarations),
      })
    }

    return info
  }

  /**
   * @internal Own exported names (including `default` and names inferred
   *   from TS `export =` namespace analysis). Raw data for
   *   `module-exports.ts` and `resolve-exports.ts` — rules use the public
   *   queries.
   */
  readonly ownExports = new Map<string, ExportMeta>()
  /** @internal Re-exported names (`export { local as exported } from`). */
  readonly reexports = new Map<string, ModuleReexportRecord>()
  /** @internal `export * from '...'` targets, lazily resolved. */
  readonly starExports: Array<() => ModuleInfo | null> = []
  /** @internal Imported modules, keyed by resolved path. */
  readonly imports = new Map<string, ModuleInfoImport>()

  /** @internal Lazily parse the module-level doc block (AST route only). */
  declare moduleDocGetter?: () => DocCommentBlock | undefined
  /** @internal The default export's declared name (both routes). */
  declare defaultExportSourceName?: DefaultExportSourceName
  /**
   * @internal Fast path for `module-doc.ts`: whether the raw content
   *   mentions a deprecation marker at all — when it doesn't, doc queries
   *   answer `undefined` without any parsing.
   */
  declare maybeHasDeprecationDoc: boolean

  declare private builtFromAst?: boolean
  declare private astTwin?: ModuleInfo | null

  // Lazily initialized memo caches.
  declare private exportInfoCache?: Map<string, ExportMeta | null | undefined>
  declare private hasExportCache?: Map<string, boolean>
  declare private hasExportsCache?: boolean

  private constructor(
    /**
     * Absolute path of the analyzed module, with native path separators —
     * the same convention as `context.physicalFilename` and the resolvers,
     * so rules can compare and combine paths without normalization.
     */
    readonly path: string,
    /** @internal The context this analysis was built under. */
    readonly context: ChildContext,
    /**
     * @internal Module format: `'Module'` — unambiguously an ES module;
     *   `'ambiguous'` — could be either (rules that depend on exact export
     *   accounting should bail out). Single-rule consumer, exposed via
     *   `getModuleFormat`.
     */
    readonly format: 'ambiguous' | 'Module',
    /**
     * The parse error the analysis died on, as data. The core never
     * reports: rules own `context.report` (see
     * `utils/report-module-parse-errors.ts`).
     */
    readonly parseError: ParseError | undefined,
  ) {}

  /** Whether the module exports anything at all (`export *` included). */
  get hasExports(): boolean {
    this.hasExportsCache ??= hasAnyExports(this)
    return this.hasExportsCache
  }

  /**
   * True if `name` is exported by this module, expanding `export * from`
   * (but default exports must be explicitly re-exported).
   *
   * Memoized per name: `namespace` asks once per member access and
   * `no-named-as-default` once per specifier, and each miss walks the whole
   * `export *` graph.
   */
  hasExport(name: string): boolean {
    this.hasExportCache ??= new Map()
    let answer = this.hasExportCache.get(name)
    if (answer === undefined) {
      answer = hasExport(this, name)
      this.hasExportCache.set(name, answer)
    }
    return answer
  }

  /**
   * Look up an exported name, following re-export chains.
   *
   * @returns Tri-state: the export's {@link ExportMeta} when found, `null`
   *   when the export exists but resolves into an unanalyzable module,
   *   `undefined` when the module does not export `name`.
   */
  getExport(name: string): ExportMeta | null | undefined {
    this.exportInfoCache ??= new Map()
    if (this.exportInfoCache.has(name)) {
      return this.exportInfoCache.get(name)
    }
    const found = lookupExport(this, name)
    const meta = found == null ? found : found.meta
    this.exportInfoCache.set(name, meta)
    return meta
  }

  /**
   * Modules imported by this module (dependencies not re-exported), keyed by
   * resolved path.
   */
  getImports(): ReadonlyMap<string, ModuleInfoImport> {
    return this.imports
  }

  /** Analyze the module at an already-resolved path, under this context. */
  private resolvePath(path: string): ModuleInfo | null {
    return ModuleInfo.for(childContext(path, this.context))
  }

  /**
   * @internal For `module-doc.ts` / `module-exports.ts` only — queries that
   *   need parse-derived data (doc comments, the default export's declared
   *   name): a lexed module carries none, so the first call runs (and
   *   memoizes) the AST route for the same file.
   *
   *   Callers must check {@link maybeHasDeprecationDoc} first, as
   *   `module-doc.ts` does. An AST-built module without a marker returns
   *   itself carrying no doc getters — the analysis skipped them precisely
   *   because no doc can exist — so calling this unguarded would silently
   *   answer `undefined` rather than escalate.
   */
  astAnalysis(): ModuleInfo | null {
    if (this.builtFromAst) {
      return this
    }
    if (this.astTwin === undefined) {
      let facts = null
      try {
        const content = fs.readFileSync(this.path, { encoding: 'utf8' })
        // reached only for a module that carries a deprecation marker, and
        // reached *because* a doc is being read — so docs are the point here
        facts = analyzeAstModule(this.path, content, this.context, true)
      } catch {
        // unreadable file — nothing more to know
      }
      if (facts == null) {
        this.astTwin = null
      } else {
        this.astTwin = ModuleInfo.fromFacts(
          this.path,
          this.context,
          facts,
          true,
        )
        this.astTwin.maybeHasDeprecationDoc = this.maybeHasDeprecationDoc
      }
    }
    return this.astTwin
  }
}
