import calculateScc from '@rtsao/scc'

import type { ChildContext, RuleContext } from '../types'

import { ExportMap, childContext } from './export-map'
import { resolve } from './resolve'

const cache = new Map<string, Record<string, number>>()

export const StronglyConnectedComponents = {
  clearCache() {
    cache.clear()
  },

  get(source: string, context: RuleContext) {
    const path = resolve(source, context)
    if (path == null) {
      return null
    }
    return StronglyConnectedComponents.for(childContext(path, context))
  },

  for(context: ChildContext) {
    const cacheKey = context.cacheKey
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!
    }
    const scc = StronglyConnectedComponents.calculate(context)
    cache.set(cacheKey, scc)
    return scc
  },

  calculate(context: ChildContext) {
    const exportMap = ExportMap.for(context)
    const adjacencyList =
      StronglyConnectedComponents.exportMapToAdjacencyList(exportMap)
    const calculatedScc = calculateScc(adjacencyList)
    return StronglyConnectedComponents.calculatedSccToPlainObject(calculatedScc)
  },

  exportMapToAdjacencyList(initialExportMap: ExportMap | null) {
    /** for each dep, what are its direct deps */
    const adjacencyList = new Map<string, Set<string>>()
    // BFS
    function visitNode(exportMap: ExportMap | null) {
      if (!exportMap) {
        return
      }
      for (const [importedPath, v] of exportMap.imports.entries()) {
        const from = exportMap.path
        const to = importedPath

        if (!adjacencyList.has(from)) {
          adjacencyList.set(from, new Set())
        }

        const set = adjacencyList.get(from)!

        if (set.has(to)) {
          continue // prevent endless loop
        }
        set.add(to)
        visitNode(v.getter())
      }
    }
    visitNode(initialExportMap)
    // Fill gaps
    // eslint-disable-next-line unicorn/no-array-for-each -- Map.forEach, and it is way faster
    adjacencyList.forEach(values => {
      // eslint-disable-next-line unicorn/no-array-for-each -- Set.forEach
      values.forEach(value => {
        if (!adjacencyList.has(value)) {
          adjacencyList.set(value, new Set())
        }
      })
    })

    return adjacencyList
  },

  calculatedSccToPlainObject(sccs: Array<Set<string>>) {
    /** for each key, its SCC's index */
    const obj: Record<string, number> = {}
    for (const [index, scc] of sccs.entries()) {
      for (const node of scc) {
        obj[node] = index
      }
    }
    return obj
  },
}
