/** Ensures that no imported module imports the linted module. */

import type { DeclarationMetadata, ModuleOptions } from '../utils/index.js'
import {
  ExportMap,
  isExternalModule,
  createRule,
  moduleVisitor,
  makeOptionsSchema,
  resolve,
} from '../utils/index.js'

export interface Options extends ModuleOptions {
  allowUnsafeDynamicCyclicDependency?: boolean
  ignoreExternal?: boolean
  maxDepth?: number | '∞'
}

export type MessageId = 'cycle' | 'cycleSource'

export interface Traverser {
  mget(): ExportMap | null
  route: Array<DeclarationMetadata['source']>
}

const traversed = new Set<string>()

export default createRule<[Options?], MessageId>({
  name: 'no-cycle',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description:
        'Forbid a module from importing a module with a dependency path back to itself.',
    },
    schema: [
      makeOptionsSchema({
        maxDepth: {
          anyOf: [
            {
              description: 'maximum dependency depth to traverse',
              type: 'integer',
              minimum: 1,
            },
            {
              enum: ['∞'],
              type: 'string',
            },
          ],
        },
        ignoreExternal: {
          description: 'ignore external modules',
          type: 'boolean',
          default: false,
        },
        allowUnsafeDynamicCyclicDependency: {
          description:
            'Allow cyclic dependency if there is at least one dynamic import in the chain',
          type: 'boolean',
          default: false,
        },
      }),
    ],
    messages: {
      cycle: 'Dependency cycle detected',
      cycleSource: 'Dependency cycle via "{{source}}"',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.physicalFilename

    if (filename === '<text>') {
      return {}
    } // can't cycle-check a non-file

    const options = context.options[0] || {}

    const maxDepth =
      typeof options.maxDepth === 'number'
        ? options.maxDepth
        : Number.POSITIVE_INFINITY

    const ignoreModule = options.ignoreExternal
      ? (name: string) =>
          isExternalModule(name, resolve(name, context)!, context)
      : () => false

    return {
      ...moduleVisitor(function checkSourceValue(sourceNode, importer) {
        if (ignoreModule(sourceNode.value)) {
          return // ignore external modules
        }
        if (
          options.allowUnsafeDynamicCyclicDependency &&
          // Ignore `import()`
          (importer.type === 'ImportExpression' ||
            // `require()` calls are always checked (if possible)
            (importer.type === 'CallExpression' &&
              'name' in importer.callee &&
              importer.callee.name !== 'require'))
        ) {
          return // cycle via dynamic import allowed by config
        }

        if (
          importer.type === 'ImportDeclaration' &&
          // import type { Foo } (TS and Flow)
          (importer.importKind === 'type' ||
            // import { type Foo } (Flow)
            importer.specifiers.every(
              s => 'importKind' in s && s.importKind === 'type',
            ))
        ) {
          return // ignore type imports
        }

        const imported = ExportMap.get(sourceNode.value, context)

        if (imported == null) {
          return // no-unresolved territory
        }

        if (imported.path === filename) {
          return // no-self-import territory
        }

        const untraversed: Traverser[] = [{ mget: () => imported, route: [] }]

        function detectCycle({ mget, route }: Traverser) {
          const m = mget()

          if (m == null) {
            return
          }

          if (traversed.has(m.path)) {
            return
          }

          traversed.add(m.path)

          for (const [path, { getter, declarations }] of m.imports) {
            if (traversed.has(path)) {
              continue
            }
            const toTraverse = [...declarations].filter(
              ({ source, isOnlyImportingTypes }) =>
                !ignoreModule(source.value as string) &&
                // Ignore only type imports
                !isOnlyImportingTypes,
            )

            /**
             * If cyclic dependency is allowed via dynamic import, skip checking
             * if any module is imported dynamically
             */
            if (
              options.allowUnsafeDynamicCyclicDependency &&
              toTraverse.some(d => d.dynamic)
            ) {
              return
            }

            /**
             * Only report as a cycle if there are any import declarations that
             * are considered by the rule. For example:
             *
             * A.ts: import { foo } from './b' // should not be reported as a
             * cycle
             *
             * B.ts: import type { Bar } from './a'
             */
            if (path === filename && toTraverse.length > 0) {
              return true
            }
            if (route.length + 1 < maxDepth) {
              for (const { source } of toTraverse) {
                untraversed.push({ mget: getter, route: [...route, source] })
              }
            }
          }
        }

        while (untraversed.length > 0) {
          const next = untraversed.shift()! // bfs!
          if (detectCycle(next)) {
            if (next.route.length > 0) {
              context.report({
                node: importer,
                messageId: 'cycleSource',
                data: {
                  source: routeString(next.route),
                },
              })
            } else {
              context.report({
                node: importer,
                messageId: 'cycle',
              })
            }
            return
          }
        }
      }, context.options[0]),
      'Program:exit'() {
        traversed.clear()
      },
    }
  },
})

function routeString(route: Array<DeclarationMetadata['source']>) {
  return route.map(s => `${s.value}:${s.loc.start.line}`).join('=>')
}
