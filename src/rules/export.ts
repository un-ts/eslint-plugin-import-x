import { AST_NODE_TYPES } from '@typescript-eslint/types'
import type { TSESTree } from '@typescript-eslint/utils'

import { getExportKind, getExportNames, ModuleInfo } from '../core/index.js'
import {
  recursivePatternCapture,
  createRule,
  getValue,
} from '../utils/index.js'
import { reportModuleParseErrors } from '../utils/report-module-parse-errors.js'

/*
Notes on TypeScript namespaces aka TSModuleDeclaration:

There are two forms:
- active namespaces: namespace Foo {} / module Foo {}
- ambient modules; declare module "eslint-plugin-import" {}

active namespaces:
- cannot contain a default export
- cannot contain an export all
- cannot contain a multi name export (export { a, b })
- can have active namespaces nested within them

ambient namespaces:
- can only be defined in .d.ts files
- cannot be nested within active namespaces
- have no other restrictions
*/

const rootProgram = 'root'

/**
 * The exports of one name in one scope, by the declaration space each
 * occupies: TypeScript lets a type and a value share one name.
 */
interface NamedExports {
  value: Set<TSESTree.Node>
  type: Set<TSESTree.Node>
  /**
   * `export * from` contributions, placed into their spaces at `Program:exit`:
   * that takes resolving the name's kind, only worth doing when the name may
   * collide.
   */
  stars: Array<{ node: TSESTree.ExportAllDeclaration; remote: ModuleInfo }>
}

function declarationType(node: TSESTree.Node) {
  return node.type === AST_NODE_TYPES.ExportDefaultDeclaration
    ? node.declaration.type
    : node.parent?.type
}

/**
 * Remove function overloads like:
 *
 * ```ts
 * export function foo(a: number)
 * export function foo(a: string)
 * export function foo(a: number | string) {
 *   return a
 * }
 * ```
 *
 * Without an implementation (ambient declarations), the first signature
 * stands for the function.
 */
function removeTypescriptFunctionOverloads(nodes: Set<TSESTree.Node>) {
  const overloads = [...nodes].filter(
    node => declarationType(node) === AST_NODE_TYPES.TSDeclareFunction,
  )
  const hasImplementation = [...nodes].some(
    node => declarationType(node) === AST_NODE_TYPES.FunctionDeclaration,
  )
  for (const node of hasImplementation ? overloads : overloads.slice(1)) {
    nodes.delete(node)
  }
}

/**
 * An export written out in this scope, other than an overload signature
 * (overload-only declarations may coexist with a type-only alias).
 */
function isExplicitValue(node: TSESTree.Node) {
  return (
    node.type !== AST_NODE_TYPES.ExportAllDeclaration &&
    declarationType(node) !== AST_NODE_TYPES.TSDeclareFunction
  )
}

/**
 * Detect merging Namespaces with Classes, Functions, or Enums like:
 *
 * ```ts
 * export class Foo {}
 * export namespace Foo {}
 * ```
 */
function isTypescriptNamespaceMerging(nodes: Set<TSESTree.Node>) {
  const types = new Set(
    Array.from(nodes, node => `${node.parent!.type}` as const),
  )
  const noNamespaceNodes = [...nodes].filter(
    node => node.parent!.type !== 'TSModuleDeclaration',
  )

  return (
    types.has('TSModuleDeclaration') &&
    (types.size === 1 ||
      // Merging with functions
      (types.size === 2 &&
        (types.has('FunctionDeclaration') || types.has('TSDeclareFunction'))) ||
      (types.size === 3 &&
        types.has('FunctionDeclaration') &&
        types.has('TSDeclareFunction')) ||
      // Merging with classes or enums
      (types.size === 2 &&
        (types.has('ClassDeclaration') || types.has('TSEnumDeclaration')) &&
        noNamespaceNodes.length === 1))
  )
}

/**
 * Detect if a typescript namespace node should be reported as multiple export:
 *
 * ```ts
 * export class Foo {}
 * export function Foo()
 * export namespace Foo {}
 * ```
 */
function shouldSkipTypescriptNamespace(
  node: TSESTree.Node,
  nodes: Set<TSESTree.Node>,
) {
  const types = new Set(
    Array.from(nodes, node => `${node.parent!.type}` as const),
  )

  return (
    !isTypescriptNamespaceMerging(nodes) &&
    node.parent!.type === 'TSModuleDeclaration' &&
    (types.has('TSEnumDeclaration') ||
      types.has('ClassDeclaration') ||
      types.has('FunctionDeclaration') ||
      types.has('TSDeclareFunction'))
  )
}

export type MessageId = 'noNamed' | 'multiDefault' | 'multiNamed'

export default createRule<[], MessageId>({
  name: 'export',
  meta: {
    type: 'problem',
    docs: {
      category: 'Helpful warnings',
      description:
        'Forbid any invalid exports, i.e. re-export of the same name.',
    },
    schema: [],
    messages: {
      noNamed: "No named exports found in module '{{module}}'.",
      multiDefault: 'Multiple default exports.',
      multiNamed: "Multiple exports of name '{{name}}'.",
    },
  },
  defaultOptions: [],
  create(context) {
    const namespace = new Map<
      'root' | TSESTree.TSModuleDeclaration,
      Map<string, NamedExports>
    >([[rootProgram, new Map()]])

    function getNamed(
      name: string,
      parent: TSESTree.TSModuleDeclaration | 'root',
    ) {
      if (!namespace.has(parent)) {
        namespace.set(parent, new Map())
      }

      const named = namespace.get(parent)!

      let exports = named.get(name)

      if (exports == null) {
        exports = { value: new Set(), type: new Set(), stars: [] }
        named.set(name, exports)
      }

      return exports
    }

    function addNamed(
      name: string,
      node: TSESTree.Node,
      parent: TSESTree.TSModuleDeclaration | 'root',
      isType?: boolean,
    ) {
      getNamed(name, parent)[isType ? 'type' : 'value'].add(node)
    }

    /**
     * Place each `export *` contribution into the spaces its kind occupies,
     * resolving the kind only when the name is exported more than once.
     */
    function placeStarExports(name: string, exports: NamedExports) {
      const { value, type, stars } = exports
      if (stars.length + value.size + type.size <= 1) {
        return
      }
      for (const { node, remote } of stars) {
        const kind = getExportKind(remote, name, node.exportKind === 'type')
        if (kind === undefined) {
          continue
        }
        // unresolvable (`null`) counts as a value
        if (kind !== 'type') {
          value.add(node)
        }
        if (kind === 'type' || kind === 'both') {
          type.add(node)
        }
      }
    }

    function getParent(node: TSESTree.Node) {
      if (node.parent?.type === 'TSModuleBlock') {
        return node.parent.parent as TSESTree.TSModuleDeclaration
      }

      // just in case somehow a non-ts namespace export declaration isn't directly
      // parented to the root Program node
      return rootProgram
    }

    return {
      ExportDefaultDeclaration(node) {
        addNamed('default', node, getParent(node))
      },

      ExportSpecifier(node) {
        addNamed(
          getValue(node.exported),
          node.exported,
          getParent(node.parent!),
          node.exportKind === 'type' || node.parent!.exportKind === 'type',
        )
      },

      ExportNamedDeclaration(node) {
        if (node.declaration == null) {
          return
        }

        const parent = getParent(node)

        const isTypeVariableDecl =
          'kind' in node.declaration &&
          // @ts-expect-error - support for old TypeScript versions
          node.declaration.kind === 'type'

        if ('id' in node.declaration && node.declaration.id != null) {
          const id = node.declaration.id as TSESTree.Identifier
          addNamed(
            id.name,
            id,
            parent,
            ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'].includes(
              node.declaration.type,
            ) || isTypeVariableDecl,
          )
        }

        if (
          'declarations' in node.declaration &&
          node.declaration.declarations != null
        ) {
          for (const declaration of node.declaration.declarations) {
            recursivePatternCapture(declaration.id, v => {
              addNamed(
                (v as TSESTree.Identifier).name,
                v,
                parent,
                isTypeVariableDecl,
              )
            })
          }
        }
      },

      ExportAllDeclaration(node) {
        if (node.source == null) {
          return
        } // not sure if this is ever true

        // `export * as X from path` does not conflict
        if (node.exported && node.exported.name) {
          return
        }

        const remoteExports = ModuleInfo.get(node.source.value, context)
        if (remoteExports == null) {
          return
        }

        if (remoteExports.parseError) {
          reportModuleParseErrors(context, remoteExports, node)
          return
        }

        const parent = getParent(node)

        let any = false

        for (const name of getExportNames(remoteExports)) {
          if (name !== 'default') {
            any = true // poor man's filter
            getNamed(name, parent).stars.push({ node, remote: remoteExports })
          }
        }

        if (!any) {
          context.report({
            node: node.source,
            messageId: 'noNamed',
            data: { module: node.source.value },
          })
        }
      },

      'Program:exit'() {
        for (const [, named] of namespace) {
          for (const [name, exports] of named) {
            placeStarExports(name, exports)

            // a type-only specifier is an alias, which also conflicts with an
            // explicit value export of its name
            if ([...exports.value].some(isExplicitValue)) {
              for (const node of exports.type) {
                if (node.parent?.type === AST_NODE_TYPES.ExportSpecifier) {
                  exports.value.add(node)
                }
              }
            }

            // a node in both spaces is still one export
            const reported = new Set<TSESTree.Node>()

            for (const nodes of [exports.value, exports.type]) {
              if (nodes.size === 0) {
                continue
              }

              removeTypescriptFunctionOverloads(nodes)

              if (nodes.size <= 1) {
                continue
              }

              if (isTypescriptNamespaceMerging(nodes)) {
                continue
              }

              for (const node of nodes) {
                if (
                  reported.has(node) ||
                  shouldSkipTypescriptNamespace(node, nodes)
                ) {
                  continue
                }
                reported.add(node)

                if (name === 'default') {
                  context.report({
                    node,
                    messageId: 'multiDefault',
                  })
                } else {
                  context.report({
                    node,
                    messageId: 'multiNamed',
                    data: { name },
                  })
                }
              }
            }
          }
        }
      },
    }
  },
})
