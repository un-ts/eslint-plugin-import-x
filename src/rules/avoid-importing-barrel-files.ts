import type { TSESTree } from '@typescript-eslint/utils'

import type { ModuleImportDeclaration } from '../core/index.js'
import { ModuleInfo } from '../core/index.js'
import {
  createRule,
  getModuleSurface,
  isBarrelFileSurface,
} from '../utils/index.js'

export interface Options {
  allowList?: string[]
  maxModuleGraphSizeAllowed?: number
  amountOfExportsToConsiderModuleAsBarrel?: number
}

export type MessageId = 'avoidImport'

const defaultOptions: Required<Options> = {
  allowList: [],
  maxModuleGraphSizeAllowed: 20,
  amountOfExportsToConsiderModuleAsBarrel: 3,
}

/**
 * Whether an edge into a dependency loads it at runtime. Type-only imports are
 * erased by the compiler and so contribute nothing to the graph the rule is
 * trying to bound.
 */
function isRuntimeEdge(
  declarations: ReadonlySet<ModuleImportDeclaration>,
): boolean {
  for (const declaration of declarations) {
    if (!declaration.isOnlyImportingTypes) {
      return true
    }
  }
  return false
}

/**
 * Number of modules reachable from `entry`, `entry` included. Resolution and
 * caching are `ModuleInfo`'s — the same resolver the rest of the plugin uses —
 * so graph traversal here needs no resolver options of its own.
 */
function countModuleGraphSize(entry: ModuleInfo): number {
  const visited = new Set<string>()
  const queue: ModuleInfo[] = [entry]

  while (queue.length > 0) {
    const moduleInfo = queue.pop()!
    if (visited.has(moduleInfo.path)) {
      continue
    }
    visited.add(moduleInfo.path)

    for (const imported of moduleInfo.getImports().values()) {
      if (!isRuntimeEdge(imported.declarations)) {
        continue
      }
      const resolved = imported.resolve()
      if (resolved != null && !visited.has(resolved.path)) {
        queue.push(resolved)
      }
    }
  }

  return visited.size
}

export default createRule<[Options?], MessageId>({
  name: 'avoid-importing-barrel-files',
  meta: {
    type: 'problem',
    docs: {
      category: 'Performance',
      description: 'Forbid importing barrel files.',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowList: {
            type: 'array',
            description: 'List of modules from which to allow barrel files',
            default: defaultOptions.allowList,
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          maxModuleGraphSizeAllowed: {
            type: 'number',
            description: 'Maximum allowed module graph size',
            default: defaultOptions.maxModuleGraphSizeAllowed,
          },
          amountOfExportsToConsiderModuleAsBarrel: {
            type: 'number',
            description:
              'Amount of exports to consider a module as barrel file',
            default: defaultOptions.amountOfExportsToConsiderModuleAsBarrel,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      avoidImport:
        'The imported module "{{specifier}}" is a barrel file, which leads to importing a module graph of {{amount}} modules, which exceeds the maximum allowed size of {{maxModuleGraphSizeAllowed}} modules',
    },
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const {
      maxModuleGraphSizeAllowed = defaultOptions.maxModuleGraphSizeAllowed,
      amountOfExportsToConsiderModuleAsBarrel = defaultOptions.amountOfExportsToConsiderModuleAsBarrel,
      allowList = defaultOptions.allowList,
    } = context.options[0] || {}
    // consulted once per import and possibly long; a Set keeps the lookup O(1)
    const allowed = new Set(allowList)

    const checkBarrelFile = (
      moduleInfo: ModuleInfo,
      reportNode: TSESTree.Node,
      specifier: string,
    ) => {
      const surface = getModuleSurface(moduleInfo.path, context)

      if (
        surface == null ||
        !isBarrelFileSurface(surface, amountOfExportsToConsiderModuleAsBarrel)
      ) {
        return
      }

      const moduleGraphSize = countModuleGraphSize(moduleInfo)

      if (moduleGraphSize > maxModuleGraphSizeAllowed) {
        context.report({
          node: reportNode,
          messageId: 'avoidImport',
          data: {
            amount: moduleGraphSize,
            specifier,
            maxModuleGraphSizeAllowed,
          },
        })
      }
    }

    return {
      ImportDeclaration(node) {
        if (node.importKind === 'type') {
          return
        }
        // `import { type A, type B } from '...'` is erased as well
        if (
          node.specifiers.length > 0 &&
          node.specifiers.every(
            specifier =>
              specifier.type === 'ImportSpecifier' &&
              specifier.importKind === 'type',
          )
        ) {
          return
        }

        const moduleSpecifier = node.source.value

        if (allowed.has(moduleSpecifier)) {
          return
        }

        // `ModuleInfo.get` resolves with the plugin's resolver and applies the
        // user's settings, and analyzes the target through its own cache.
        const moduleInfo = ModuleInfo.get(moduleSpecifier, context)

        if (moduleInfo == null) {
          return
        }

        checkBarrelFile(moduleInfo, node.source, moduleSpecifier)
      },
    }
  },
})
