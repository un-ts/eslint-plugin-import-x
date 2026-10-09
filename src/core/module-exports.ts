import type { DefaultExportSourceName } from './ast-module.js'
import type { ModuleInfo, ModuleReexportRecord } from './module-info.js'
import { collectExportNames, deepResolveExport } from './resolve-exports.js'

export type { DefaultExportSourceName } from './ast-module.js'

/**
 * Extended module queries, each needed by a single rule — kept off the
 * minimal `ModuleInfo` surface as standalone functions. A rule declares what
 * it depends on by importing it.
 */

const exportNamesCache = new WeakMap<ModuleInfo, ReadonlySet<string>>()
const starExportPathsCache = new WeakMap<ModuleInfo, readonly string[]>()
const deepExportCache = new WeakMap<ModuleInfo, Map<string, DeepExportResult>>()

/** The outcome of {@link resolveDeepExport}; treat as read-only. */
export interface DeepExportResult {
  found: boolean
  path: readonly string[]
}

/**
 * Module format of the analyzed file — `named` bails out on `'ambiguous'`
 * because it depends on exact export accounting.
 */
export function getModuleFormat(
  moduleInfo: ModuleInfo,
): 'ambiguous' | 'Module' {
  return moduleInfo.format
}

/** Whether the module has a default export (including re-exported ones). */
export function hasDefaultExport(moduleInfo: ModuleInfo): boolean {
  // through `getExport`, not `lookupExport` directly: it memoizes per name,
  // and `no-named-as-default` asks once per default-import specifier — each
  // miss walking the whole re-export and `export *` graph
  return moduleInfo.getExport('default') != null
}

/**
 * True if `name` is exported by this module's own code (including
 * `export * as ns` and names inferred from TS `export =` namespace
 * analysis), i.e. not counting re-export statements or `export * from`
 * expansion.
 */
export function hasOwnExport(moduleInfo: ModuleInfo, name: string): boolean {
  return moduleInfo.ownExports.has(name)
}

/**
 * True if `name` is written in an explicit export statement of this module.
 * Unlike {@link hasOwnExport}, names only inferred from TS `export =`
 * namespace analysis do not count — importing such a package's default under
 * its own namespace name is the documented usage, not a mistake.
 */
export function hasExplicitExport(
  moduleInfo: ModuleInfo,
  name: string,
): boolean {
  const own = moduleInfo.ownExports.get(name)
  return own !== undefined && !own.inferred
}

/**
 * Ensure that an imported name fully resolves through re-export chains.
 *
 * Memoized per name: `named` asks once per import specifier, and each miss
 * walks the re-export and `export *` graph. The result is shared, so callers
 * must only read it.
 *
 * @returns `found`, plus the chain of module file paths that was followed
 *   (starting with this module). Paths use native separators, like
 *   `ModuleInfo#path`.
 */
export function resolveDeepExport(
  moduleInfo: ModuleInfo,
  name: string,
): DeepExportResult {
  let perName = deepExportCache.get(moduleInfo)
  if (perName === undefined) {
    perName = new Map()
    deepExportCache.set(moduleInfo, perName)
  }
  let result = perName.get(name)
  if (result === undefined) {
    result = deepResolveExport(moduleInfo, name)
    perName.set(name, result)
  }
  return result
}

/**
 * All exported names, expanding `export * from '...'` (whose `default`
 * exports are excluded, as they are not re-exported by `export *`).
 */
export function getExportNames(moduleInfo: ModuleInfo): ReadonlySet<string> {
  let names = exportNamesCache.get(moduleInfo)
  if (names === undefined) {
    names = collectExportNames(moduleInfo)
    exportNamesCache.set(moduleInfo, names)
  }
  return names
}

/** Names exported by this module's own code; see {@link hasOwnExport}. */
export function getOwnExportNames(moduleInfo: ModuleInfo): string[] {
  return [...moduleInfo.ownExports.keys()]
}

/** Re-exported names, keyed by the exported name. */
export function getReexports(
  moduleInfo: ModuleInfo,
): ReadonlyMap<string, ModuleReexportRecord> {
  return moduleInfo.reexports
}

/**
 * The name the module's default export is declared under inside the module
 * (e.g. `Foo` for `export default class Foo {}`) — needed only by
 * `no-rename-default`. Both routes derive it during analysis; the lexer's
 * verdict is deliberately final (no AST escalation — see the fail-open
 * corners documented on `LexedEsModule#defaultExportSourceName`).
 *
 * @returns `undefined` when there is no default export or no name can be
 *   determined (anonymous declarations, unhandled expressions, ...).
 */
export function getDefaultExportSourceName(
  moduleInfo: ModuleInfo,
): DefaultExportSourceName | undefined {
  return moduleInfo.defaultExportSourceName
}

/**
 * Resolved paths of `export * from '...'` targets that could be analyzed.
 * Cached: each call resolves every star target, which analyzes those modules.
 */
export function getStarExportPaths(moduleInfo: ModuleInfo): readonly string[] {
  let paths = starExportPathsCache.get(moduleInfo)
  if (paths === undefined) {
    const built: string[] = []
    for (const resolveStar of moduleInfo.starExports) {
      const target = resolveStar()
      if (target != null) {
        built.push(target.path)
      }
    }
    paths = built
    starExportPathsCache.set(moduleInfo, paths)
  }
  return paths
}
