import { createRule } from '../utils/index.js'

export interface Options {
  allowList?: string[]
}

export type MessageId = 'avoidNamespace'

const defaultOptions: Required<Options> = {
  allowList: [],
}

export default createRule<[Options?], MessageId>({
  name: 'avoid-namespace-import',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid namespace imports.',
      category: 'Performance',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowList: {
            type: 'array',
            description: 'List of namespace imports to allow',
            default: defaultOptions.allowList,
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      avoidNamespace:
        'Avoid namespace imports, it leads to unused imports and prevents treeshaking.',
    },
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const { allowList = defaultOptions.allowList } = context.options[0] || {}
    // `allowList` is consulted once per namespace import and may hold many
    // entries; a Set keeps the lookup O(1).
    const allowed = new Set(allowList)

    return {
      ImportNamespaceSpecifier(node) {
        if (
          node.parent.importKind !== 'type' &&
          !allowed.has(node.parent.source.value)
        ) {
          context.report({
            node,
            messageId: 'avoidNamespace',
          })
        }
      },
    }
  },
})
