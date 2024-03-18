import { createRule, moduleVisitor } from '../utils'

export = createRule({
  name: 'no-webpack-loader-syntax',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description: 'Forbid webpack loader syntax in imports.',
    },
    schema: [],
    messages: {
      unexpected:
        "Unexpected '!' in '{{name}}'. Do not use import syntax to configure webpack loaders.",
    },
  },
  defaultOptions: [],
  create(context) {
    return moduleVisitor(
      (source, node) => {
        if (source.value?.includes('!')) {
          context.report({
            node,
            messageId: 'unexpected',
            data: {
              name: source.value,
            },
          })
        }
      },
      { commonjs: true },
    )
  },
})
