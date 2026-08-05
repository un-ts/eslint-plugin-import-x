import type { DefaultExportSourceName } from './ast-module.js'
import type { ModuleInfo } from './module-info.js'
import {
  collectExportNames,
  deepResolveExport,
  lookupExport,
} from './resolve-exports.js'

export type { DefaultExportSourceName } from './ast-module.js'

/**
 * Extended module queries, each needed by a single rule — kept off the
 * minimal `ModuleInfo` surface as standalone functions. A rule declares what
 * it depends on by importing it.
 */

/** One re-exported name, as consumed by `no-unused-modules`. */
export interface ModuleReexportView {
  local: string
  getTargetPath(): string | null
}

const exportNamesCache = new WeakMap<ModuleInfo, ReadonlySet<string>>()
const reexportsViewCache = new WeakMap<
  ModuleInfo,
  ReadonlyMap<string, ModuleReexportView>
>()

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
  return lookupExport(moduleInfo, 'default') != null
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
 * @returns `found`, plus the chain of module file paths that was followed
 *   (starting with this module).
 */
export function resolveDeepExport(
  moduleInfo: ModuleInfo,
  name: string,
): { found: boolean; path: string[] } {
  return deepResolveExport(moduleInfo, name)
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
): ReadonlyMap<string, ModuleReexportView> {
  let view = reexportsViewCache.get(moduleInfo)
  if (view === undefined) {
    const built = new Map<string, ModuleReexportView>()
    for (const [name, { local, resolveTarget }] of moduleInfo.reexports) {
      built.set(name, {
        local,
        getTargetPath: () => resolveTarget()?.path ?? null,
      })
    }
    view = built
    reexportsViewCache.set(moduleInfo, view)
  }
  return view
}

/**
 * The name the module's default export is declared under inside the module
 * (e.g. `Foo` for `export default class Foo {}`) — needed only by
 * `no-rename-default`, and expensive: it requires parse-derived data, so on
 * a lexer-analyzed module the first call runs (and memoizes) the AST route.
 *
 * @returns `undefined` when there is no default export or no name can be
 *   determined (anonymous declarations, unhandled expressions, ...).
 */
export function getDefaultExportSourceName(
  moduleInfo: ModuleInfo,
): DefaultExportSourceName | undefined {
  return moduleInfo.defaultExportSourceName
}

/** Resolved paths of `export * from '...'` targets that could be analyzed. */
export function getStarExportPaths(moduleInfo: ModuleInfo): string[] {
  const paths: string[] = []
  for (const resolveStar of moduleInfo.starExports) {
    const target = resolveStar()
    if (target != null) {
      paths.push(target.path)
    }
  }
  return paths
}
