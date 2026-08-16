import { createRule } from '../utils/index.js'

export interface Options {
  allowList: string[]
}

export type MessageId = 'avoidNamespace'

const defaultOptions: Options = {
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
            default: [],
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
  create: context => {
    const options = context.options[0] || defaultOptions
    const allowList = options.allowList

    return {
      ImportNamespaceSpecifier(node) {
        if (
          node.parent.importKind !== 'type' &&
          !allowList.includes(node.parent.source.value)
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
