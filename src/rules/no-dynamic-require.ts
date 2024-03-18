import { TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

function isRequire(node: TSESTree.CallExpression) {
  return (
    node &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length >= 1
  )
}

function isDynamicImport(node: TSESTree.CallExpression) {
  return (
    node &&
    node.callee &&
    // @ts-expect-error - legacy parser type
    node.callee.type === 'Import'
  )
}

function isStaticValue(
  node: TSESTree.Node,
): node is TSESTree.Literal | TSESTree.TemplateLiteral {
  return (
    node.type === 'Literal' ||
    (node.type === 'TemplateLiteral' && node.expressions.length === 0)
  )
}

type Options = {
  esmodule?: boolean
}

type MessageId = 'import' | 'require'

export = createRule<[Options?], MessageId>({
  name: 'no-dynamic-require',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description: 'Forbid `require()` calls with expressions.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          esmodule: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      import: 'Calls to import() should use string literals',
      require: 'Calls to require() should use string literals',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}

    return {
      CallExpression(node) {
        if (!node.arguments[0] || isStaticValue(node.arguments[0])) {
          return
        }
        if (isRequire(node)) {
          return context.report({
            node,
            messageId: 'require',
          })
        }
        if (options.esmodule && isDynamicImport(node)) {
          return context.report({
            node,
            messageId: 'import',
          })
        }
      },
      ImportExpression(node) {
        if (!options.esmodule || isStaticValue(node.source)) {
          return
        }
        return context.report({
          node,
          messageId: 'import',
        })
      },
    }
  },
})
