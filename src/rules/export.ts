import { AST_NODE_TYPES } from '@typescript-eslint/types'
import type { TSESTree } from '@typescript-eslint/utils'

import {
  ExportMap,
  recursivePatternCapture,
  createRule,
  getValue,
} from '../utils/index.js'

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
const tsTypePrefix = 'type:'
const valuePrefix = 'value:'

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
 */
function removeTypescriptFunctionOverloads(nodes: Set<TSESTree.Node>) {
  let overload: TSESTree.Node | undefined
  let hasImplementation = false
  for (const node of nodes) {
    const declType =
      node.type === AST_NODE_TYPES.ExportDefaultDeclaration
        ? node.declaration.type
        : node.parent?.type
    if (declType === AST_NODE_TYPES.TSDeclareFunction) {
      overload ??= node
      nodes.delete(node)
    } else if (declType === AST_NODE_TYPES.FunctionDeclaration) {
      hasImplementation = true
    }
  }

  if (
    overload &&
    !hasImplementation &&
    [...nodes].some(node => {
      if (
        node.parent?.type === AST_NODE_TYPES.TSModuleDeclaration ||
        ('exportKind' in node && node.exportKind === 'type')
      ) {
        return false
      }
      const specifier = node.parent
      return (
        specifier?.type !== AST_NODE_TYPES.ExportSpecifier ||
        (specifier.exportKind !== 'type' &&
          specifier.parent?.exportKind !== 'type')
      )
    })
  ) {
    // Ambient type aliases can merge with signatures, but distinct values cannot.
    nodes.add(overload)
  }
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
      Map<string, Set<TSESTree.Node>>
    >([[rootProgram, new Map()]])

    function addNamed(
      name: string,
      node: TSESTree.Node,
      parent: TSESTree.TSModuleDeclaration | 'root',
      isType?: boolean,
    ) {
      if (!namespace.has(parent)) {
        namespace.set(parent, new Map())
      }

      const named = namespace.get(parent)!

      // Type-only exports still share the module's single default export.
      const prefix = isType && name !== 'default' ? tsTypePrefix : valuePrefix
      const key = `${prefix}${name}`

      let nodes = named.get(key)

      if (nodes == null) {
        nodes = new Set()
        named.set(key, nodes)
      }

      nodes.add(node)
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

        const remoteExports = ExportMap.get(node.source.value, context)
        if (remoteExports == null) {
          return
        }

        if (remoteExports.errors.length > 0) {
          remoteExports.reportErrors(context, node)
          return
        }

        const parent = getParent(node)

        let any = false

        remoteExports.$forEach((_, name) => {
          if (name !== 'default') {
            any = true // poor man's filter
            const kind = remoteExports.getExportKind(name)
            const isType = node.exportKind === 'type'
            if (kind !== 'none' && (!isType || kind !== 'value')) {
              addNamed(name, node, parent, isType || kind === 'type')
              if (!isType && kind === 'both') {
                addNamed(name, node, parent, true)
              }
            }
          }
        })

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
          // Type-only specifiers cannot redeclare other explicit exports.
          for (const [name, nodes] of named) {
            if (!name.startsWith(tsTypePrefix)) {
              continue
            }
            const valueNodes = named.get(
              `${valuePrefix}${name.slice(tsTypePrefix.length)}`,
            )
            if (
              !valueNodes ||
              [...valueNodes].every(
                node => node.type === AST_NODE_TYPES.ExportAllDeclaration,
              )
            ) {
              continue
            }
            for (const node of nodes) {
              if (node.parent?.type === AST_NODE_TYPES.ExportSpecifier) {
                valueNodes.add(node)
              }
            }
          }

          const reported = new Map<string, Set<TSESTree.Node>>()

          for (const [name, nodes] of named) {
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

            const exportedName = name.slice(
              name.startsWith(tsTypePrefix)
                ? tsTypePrefix.length
                : valuePrefix.length,
            )
            const reportedNodes =
              reported.get(exportedName) || new Set<TSESTree.Node>()
            reported.set(exportedName, reportedNodes)

            for (const node of nodes) {
              if (
                reportedNodes.has(node) ||
                shouldSkipTypescriptNamespace(node, nodes)
              ) {
                continue
              }

              if (exportedName === 'default') {
                context.report({
                  node,
                  messageId: 'multiDefault',
                })
              } else {
                context.report({
                  node,
                  messageId: 'multiNamed',
                  data: {
                    name: exportedName,
                  },
                })
              }

              reportedNodes.add(node)
            }
          }
        }
      },
    }
  },
})
