import type { TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

type Literal = string | number | bigint | boolean | RegExp | null

/**
 * Returns an array with names of the properties in the accessor chain for MemberExpression nodes
 *
 * Example:
 *
 * `module.exports = {}` => ['module', 'exports']
 * `module.exports.property = true` => ['module', 'exports', 'property']
 */
function accessorChain(node: TSESTree.MemberExpression) {
  const chain: Literal[] = []

  let exp: TSESTree.Expression = node

  do {
    if ('name' in exp.property) {
      chain.unshift(exp.property.name)
    } else if ('value' in exp.property) {
      chain.unshift(exp.property.value)
    }

    if (exp.object.type === 'Identifier') {
      chain.unshift(exp.object.name)
      break
    }

    exp = exp.object
  } while (exp.type === 'MemberExpression')

  return chain
}

type MessageId = 'ExportNamedDeclaration' | 'AssignmentExpression'

export = createRule<[], MessageId>({
  name: 'group-exports',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description:
        'Prefer named exports to be grouped together in a single export declaration.',
    },
    schema: [],
    messages: {
      ExportNamedDeclaration:
        'Multiple named export declarations; consolidate all named exports into a single export declaration',
      AssignmentExpression:
        'Multiple CommonJS exports; consolidate all exports into a single assignment to `module.exports`',
    },
  },
  defaultOptions: [],
  create(context) {
    const nodes = {
      modules: {
        set: new Set<
          | TSESTree.ExportNamedDeclarationWithoutSourceWithMultiple
          | TSESTree.ExportNamedDeclarationWithoutSourceWithSingle
        >(),
        sources: {} as Record<string, TSESTree.ExportNamedDeclaration[]>,
      },
      types: {
        set: new Set<
          | TSESTree.ExportNamedDeclarationWithoutSourceWithMultiple
          | TSESTree.ExportNamedDeclarationWithoutSourceWithSingle
        >(),
        sources: {} as Record<string, TSESTree.ExportNamedDeclaration[]>,
      },
      commonjs: {
        set: new Set<TSESTree.AssignmentExpression>(),
      },
    }

    return {
      ExportNamedDeclaration(node) {
        const target = node.exportKind === 'type' ? nodes.types : nodes.modules
        if (!node.source) {
          target.set.add(node)
        } else if (Array.isArray(target.sources[node.source.value])) {
          target.sources[node.source.value].push(node)
        } else {
          target.sources[node.source.value] = [node]
        }
      },

      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') {
          return
        }

        const chain = accessorChain(node.left)

        // Assignments to module.exports
        // Deeper assignments are ignored since they just modify what's already being exported
        // (ie. module.exports.exported.prop = true is ignored)
        if (
          chain[0] === 'module' &&
          chain[1] === 'exports' &&
          chain.length <= 3
        ) {
          nodes.commonjs.set.add(node)
          return
        }

        // Assignments to exports (exports.* = *)
        if (chain[0] === 'exports' && chain.length === 2) {
          nodes.commonjs.set.add(node)
          return
        }
      },

      'Program:exit'() {
        // Report multiple `export` declarations (ES2015 modules)
        if (nodes.modules.set.size > 1) {
          for (const node of nodes.modules.set) {
            context.report({
              node,
              messageId: node.type,
            })
          }
        }

        // Report multiple `aggregated exports` from the same module (ES2015 modules)
        for (const node of Object.values(nodes.modules.sources)
          .filter(
            nodesWithSource =>
              Array.isArray(nodesWithSource) && nodesWithSource.length > 1,
          )
          .flat()) {
          context.report({
            node,
            messageId: node.type,
          })
        }

        // Report multiple `export type` declarations (FLOW ES2015 modules)
        if (nodes.types.set.size > 1) {
          for (const node of nodes.types.set) {
            context.report({
              node,
              messageId: node.type,
            })
          }
        }

        // Report multiple `aggregated type exports` from the same module (FLOW ES2015 modules)
        for (const node of Object.values(nodes.types.sources)
          .filter(
            nodesWithSource =>
              Array.isArray(nodesWithSource) && nodesWithSource.length > 1,
          )
          .flat()) {
          context.report({
            node,
            messageId: node.type,
          })
        }

        // Report multiple `module.exports` assignments (CommonJS)
        if (nodes.commonjs.set.size > 1) {
          for (const node of nodes.commonjs.set) {
            context.report({
              node,
              messageId: node.type,
            })
          }
        }
      },
    }
  },
})
