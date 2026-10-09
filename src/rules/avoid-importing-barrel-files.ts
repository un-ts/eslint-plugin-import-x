import type { TSESTree } from '@typescript-eslint/utils'

import type { ModuleImportDeclaration } from '../core/index.js'
import { ModuleInfo } from '../core/index.js'
import type { Visitor } from '../utils/index.js'
import {
  createRule,
  getModuleSurface,
  isBarrelFileSurface,
  moduleVisitor,
  resolve,
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

/** The node that referenced a module — `moduleVisitor`'s second argument. */
type Importer = Parameters<Visitor>[1]

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

/** `type`/`typeof` modifiers, which only Flow and TS parsers emit. */
function isTypeKind(kind: string | undefined): boolean {
  return kind === 'type' || kind === 'typeof'
}

/** `import type …` and `import { type A, type B } from '…'` are erased. */
function isTypeOnlyImport(node: TSESTree.ImportDeclaration): boolean {
  if (isTypeKind(node.importKind)) {
    return true
  }
  return (
    node.specifiers.length > 0 &&
    node.specifiers.every(
      specifier =>
        specifier.type === 'ImportSpecifier' &&
        isTypeKind(specifier.importKind),
    )
  )
}

/** `export type … from` and `export { type A } from '…'` are erased. */
function isTypeOnlyNamedExport(node: TSESTree.ExportNamedDeclaration): boolean {
  if (node.exportKind === 'type') {
    return true
  }
  return (
    node.specifiers.length > 0 &&
    node.specifiers.every(
      specifier => 'exportKind' in specifier && specifier.exportKind === 'type',
    )
  )
}

/**
 * Whether the statement referencing a module is erased before runtime:
 * `import type`, Flow's `import typeof`, `export type … from`, and specifier
 * lists whose members are all types. Dynamic `import()` and `require()` always
 * load the target.
 */
function isTypeOnly(importer: Importer): boolean {
  switch (importer.type) {
    case 'ImportDeclaration': {
      return isTypeOnlyImport(importer)
    }
    case 'ExportNamedDeclaration': {
      return isTypeOnlyNamedExport(importer)
    }
    case 'ExportAllDeclaration': {
      return importer.exportKind === 'type'
    }
    default: {
      // dynamic `import()`, `require()`, and AMD array elements are values
      return false
    }
  }
}

/**
 * Number of modules reachable from `entry`, `entry` included. Resolution and
 * caching are `ModuleInfo`'s — the same resolver the rest of the plugin uses —
 * so graph traversal here needs no resolver options of its own.
 *
 * The walk stops as soon as `limit` modules have been exceeded, so the result
 * is a lower bound for graphs larger than that: a barrel pulling in thousands
 * of modules costs `limit + 1` visits, not thousands.
 */
function countModuleGraphSize(entry: ModuleInfo, limit: number): number {
  const visited = new Set<string>()
  const queue: ModuleInfo[] = [entry]

  while (queue.length > 0 && visited.size <= limit) {
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
        'The imported module "{{specifier}}" is a barrel file, which leads to importing a module graph of at least {{amount}} modules, which exceeds the maximum allowed size of {{maxModuleGraphSizeAllowed}} modules',
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

    const reportBarrelFile = (
      moduleInfo: ModuleInfo,
      reportNode: TSESTree.StringLiteral,
      specifier: string,
    ) => {
      const moduleGraphSize = countModuleGraphSize(
        moduleInfo,
        maxModuleGraphSizeAllowed,
      )

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

    // every way a module can be pulled in: static imports, re-exports
    // (`export … from`), dynamic `import()` and CommonJS `require()`
    return moduleVisitor(
      (source, importer) => {
        if (isTypeOnly(importer)) {
          return
        }

        const moduleSpecifier = source.value

        if (allowed.has(moduleSpecifier)) {
          return
        }

        // The surface is the cheap filter, and reading it does not analyze the
        // module: resolve the path first, and only hand the specifier to
        // `ModuleInfo.get` — which analyzes the target — once it is a barrel.
        const path = resolve(moduleSpecifier, context)

        if (path == null) {
          return
        }

        const surface = getModuleSurface(path, context)

        if (
          surface == null ||
          !isBarrelFileSurface(surface, amountOfExportsToConsiderModuleAsBarrel)
        ) {
          return
        }

        const moduleInfo = ModuleInfo.get(moduleSpecifier, context)

        if (moduleInfo == null) {
          return
        }

        reportBarrelFile(moduleInfo, source, moduleSpecifier)
      },
      { commonjs: true },
    )
  },
})
