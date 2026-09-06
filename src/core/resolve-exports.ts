import type { ExportMeta, ModuleInfo } from './module-info.js'

/**
 * The core's export-resolution algorithms — star expansion, re-export chain
 * following, deep lookups — over `ModuleInfo`'s raw data. Semantics are
 * load-bearing for rules; see the per-function contracts.
 *
 * All recursion is cycle-guarded with visited sets — `export * from` and
 * re-export cycles terminate instead of overflowing the stack.
 */

/** Whether the module exports anything at all (`export *` included). */
export function hasAnyExports(
  moduleInfo: ModuleInfo,
  seen = new Set<string>(),
): boolean {
  if (moduleInfo.ownExports.size > 0 || moduleInfo.reexports.size > 0) {
    return true
  }
  if (seen.has(moduleInfo.path)) {
    return false
  }
  seen.add(moduleInfo.path)
  for (const resolveStar of moduleInfo.starExports) {
    const inner = resolveStar()
    if (inner != null && hasAnyExports(inner, seen)) {
      return true
    }
  }
  return false
}

/**
 * True if `name` is exported, expanding `export * from` — but a `default`
 * export must be explicitly re-exported, `export *` never forwards it.
 * Note that re-exported names count by key alone; whether the chain actually
 * resolves is {@link deepResolveExport}'s job.
 */
export function hasExport(
  moduleInfo: ModuleInfo,
  name: string,
  seen = new Set<string>(),
): boolean {
  if (moduleInfo.ownExports.has(name) || moduleInfo.reexports.has(name)) {
    return true
  }
  if (seen.has(moduleInfo.path)) {
    return false
  }
  seen.add(moduleInfo.path)
  if (name !== 'default') {
    for (const resolveStar of moduleInfo.starExports) {
      const inner = resolveStar()
      if (inner != null && hasExport(inner, name, seen)) {
        return true
      }
    }
  }
  return false
}

/** A resolved export: the module that declares it and the local name there. */
export interface DeclaredExport {
  declaring: ModuleInfo
  local: string
  meta: ExportMeta
}

/**
 * Tri-state lookup of an exported name, following re-export chains.
 *
 * @returns The declaring module's entry when found; `null` when the export
 *   exists but resolves into an unanalyzable module; `undefined` when `name`
 *   is not exported.
 */
export function lookupExport(
  moduleInfo: ModuleInfo,
  name: string,
  seen = new Set<string>(),
): DeclaredExport | null | undefined {
  const own = moduleInfo.ownExports.get(name)
  if (own !== undefined) {
    return { declaring: moduleInfo, local: name, meta: own }
  }

  const visitKey = `${moduleInfo.path}\0${name}`
  if (seen.has(visitKey)) {
    return undefined
  }
  seen.add(visitKey)

  const reexport = moduleInfo.reexports.get(name)
  if (reexport !== undefined) {
    const target = reexport.resolveTarget()
    // the export exists, but its source cannot be analyzed
    if (target == null) {
      return null
    }
    return lookupExport(target, reexport.local, seen)
  }

  // default exports must be explicitly re-exported
  if (name !== 'default') {
    for (const resolveStar of moduleInfo.starExports) {
      const inner = resolveStar()
      if (inner == null || inner.path === moduleInfo.path) {
        continue
      }
      const found = lookupExport(inner, name, seen)
      if (found !== undefined) {
        return found
      }
    }
  }
}

/**
 * Ensure that an exported name fully resolves through re-export chains,
 * collecting the chain of module paths followed (starting with
 * `moduleInfo`).
 *
 * A chain ending in an unanalyzable module counts as found — the core cannot
 * verify further, and rules must not report what they cannot disprove.
 */
export function deepResolveExport(
  moduleInfo: ModuleInfo,
  name: string,
  seen = new Set<string>(),
): { found: boolean; path: string[] } {
  if (moduleInfo.ownExports.has(name)) {
    return { found: true, path: [moduleInfo.path] }
  }

  const visitKey = `${moduleInfo.path}\0${name}`
  if (seen.has(visitKey)) {
    return { found: false, path: [moduleInfo.path] }
  }
  seen.add(visitKey)

  const reexport = moduleInfo.reexports.get(name)
  if (reexport !== undefined) {
    const target = reexport.resolveTarget()
    if (target == null) {
      return { found: true, path: [moduleInfo.path] }
    }
    const deep = deepResolveExport(target, reexport.local, seen)
    deep.path.unshift(moduleInfo.path)
    return deep
  }

  if (name !== 'default') {
    for (const resolveStar of moduleInfo.starExports) {
      const inner = resolveStar()
      // an unanalyzable star-export target could provide the name
      if (inner == null) {
        return { found: true, path: [moduleInfo.path] }
      }
      if (inner.path === moduleInfo.path) {
        continue
      }
      const deep = deepResolveExport(inner, name, seen)
      if (deep.found) {
        deep.path.unshift(moduleInfo.path)
        return deep
      }
    }
  }

  return { found: false, path: [moduleInfo.path] }
}

/**
 * Collect all exported names, expanding `export * from '...'` (whose
 * `default` exports are excluded, as `export *` never forwards them).
 */
export function collectExportNames(
  moduleInfo: ModuleInfo,
  names = new Set<string>(),
  seen = new Set<string>(),
): ReadonlySet<string> {
  if (seen.has(moduleInfo.path)) {
    return names
  }
  seen.add(moduleInfo.path)

  const topLevel = seen.size === 1

  for (const name of moduleInfo.ownExports.keys()) {
    if (topLevel || name !== 'default') {
      names.add(name)
    }
  }
  for (const name of moduleInfo.reexports.keys()) {
    if (topLevel || name !== 'default') {
      names.add(name)
    }
  }
  for (const resolveStar of moduleInfo.starExports) {
    const inner = resolveStar()
    if (inner != null) {
      collectExportNames(inner, names, seen)
    }
  }
  return names
}
