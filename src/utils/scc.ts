import calculateScc from '@rtsao/scc';
import { resolve } from './resolve';
import { ExportMap, childContext } from './export-map';
import type { ChildContext, RuleContext } from '../types';

let cache = new Map<string, Record<string, number>>();

export class StronglyConnectedComponents {
  static clearCache() {
    cache.clear()
  }

  static get(source: string, context: RuleContext) {
    const path = resolve(source, context);
    if (path == null) { return null; }
    return StronglyConnectedComponents.for(childContext(path, context));
  }

  static for(context: ChildContext) {
    const cacheKey = context.cacheKey
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)!;
    }
    const scc = StronglyConnectedComponents.calculate(context);
    cache.set(cacheKey, scc);
    return scc;
  }

  static calculate(context: ChildContext) {
    const exportMap = ExportMap.for(context);
    const adjacencyList = StronglyConnectedComponents.exportMapToAdjacencyList(exportMap);
    const calculatedScc = calculateScc(adjacencyList);
    return StronglyConnectedComponents.calculatedSccToPlainObject(calculatedScc);
  }

  static exportMapToAdjacencyList(initialExportMap: ExportMap | null) {
    /** for each dep, what are its direct deps */
    const adjacencyList = new Map<string, Set<string>>();
    // BFS
    function visitNode(exportMap: ExportMap | null) {
      if (!exportMap) {
        return;
      }
      exportMap.imports.forEach((v, importedPath) => {
        const from = exportMap.path;
        const to = importedPath;

        if (!adjacencyList.has(from)) {
          adjacencyList.set(from, new Set());
        }

        const set = adjacencyList.get(from)!;

        if (set.has(to)) {
          return; // prevent endless loop
        }
        set.add(to);
        visitNode(v.getter());
      });
    }
    visitNode(initialExportMap);
    // Fill gaps
    adjacencyList.forEach((values) => {
      values.forEach((value) => {
        if (!adjacencyList.has(value)) {
          adjacencyList.set(value, new Set());
        }
      });
    });
    return adjacencyList;
  }

  static calculatedSccToPlainObject(sccs: Set<string>[]) {
      /** for each key, its SCC's index */
    const obj: Record<string, number> = {};
    sccs.forEach((scc, index) => {
      scc.forEach((node) => {
        obj[node] = index;
      });
    });
    return obj;
  }
}
