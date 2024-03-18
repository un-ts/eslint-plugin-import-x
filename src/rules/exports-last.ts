import type { TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

function isNonExportStatement({ type }: TSESTree.Node) {
  return (
    type !== 'ExportDefaultDeclaration' &&
    type !== 'ExportNamedDeclaration' &&
    type !== 'ExportAllDeclaration'
  )
}

export = createRule({
  name: 'exports-last',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Ensure all exports appear after other statements.',
    },
    schema: [],
    messages: {
      end: 'Export statements should appear at the end of the file',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Program({ body }) {
        const lastNonExportStatementIndex =
          body.findLastIndex(isNonExportStatement)

        if (lastNonExportStatementIndex !== -1) {
          for (const node of body.slice(0, lastNonExportStatementIndex)) {
            if (!isNonExportStatement(node)) {
              context.report({
                node,
                messageId: 'end',
              })
            }
          }
        }
      },
    }
  },
})
