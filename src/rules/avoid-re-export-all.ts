import { createRule } from '../utils/index.js'

export type MessageId = 'avoidReExport'

export default createRule<[], MessageId>({
  name: 'avoid-re-export-all',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid re-exporting * from a module.',
      category: 'Performance',
      recommended: true,
    },
    schema: [],
    messages: {
      avoidReExport:
        'Avoid re-exporting * from a module, it leads to unused imports and prevents treeshaking.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ExportAllDeclaration(node) {
        if (node?.exportKind !== 'type') {
          context.report({
            node,
            messageId: 'avoidReExport',
          })
        }
      },
    }
  },
})
