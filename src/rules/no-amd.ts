/**
 * Rule to prefer imports to AMD
 */

import { TSESLint } from '@typescript-eslint/utils'
import { createRule } from '../utils'

type MessageId = 'amd'

export = createRule<[], MessageId>({
  name: 'no-amd',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Module systems',
      description: 'Forbid AMD `require` and `define` calls.',
    },
    schema: [],
    messages: {
      amd: 'Expected imports instead of AMD {{type}}().',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        // For ESLint v9
        const scope: TSESLint.Scope.Scope = (context as any)?.sourceCode
          ?.getScope
          ? (context as any).sourceCode.getScope(node)
          : context.getScope()

        if (scope.type !== 'module') {
          return
        }

        if (node.callee.type !== 'Identifier') {
          return
        }

        if (node.callee.name !== 'require' && node.callee.name !== 'define') {
          return
        }

        // todo: capture define((require, module, exports) => {}) form?
        if (node.arguments.length !== 2) {
          return
        }

        const modules = node.arguments[0]

        if (modules.type !== 'ArrayExpression') {
          return
        }

        // todo: check second arg type? (identifier or callback)

        context.report({
          node,
          messageId: 'amd',
          data: {
            type: node.callee.name,
          },
        })
      },
    }
  },
})
