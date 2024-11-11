import { createRule } from '../utils'
import sourceType from '../utils/source-type'

export = createRule({
  name: 'no-default-export',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Forbid default exports.',
    },
    schema: [],
    messages: {
      preferNamed: 'Prefer named exports.',
      noAliasDefault:
        'Do not alias `{{local}}` as `default`. Just export `{{local}}` itself instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    // ignore non-modules
    if (sourceType(context) !== 'module') {
      return {}
    }

    const { sourceCode } = context

    return {
      ExportDefaultDeclaration(node) {
        const { loc } = sourceCode.getFirstTokens(node)[1] || {}
        context.report({
          node,
          messageId: 'preferNamed',
          loc,
        })
      },

      ExportNamedDeclaration(node) {
        for (const specifier of node.specifiers.filter(
          specifier =>
            (specifier.exported.name ||
              ('value' in specifier.exported && specifier.exported.value)) ===
            'default',
        )) {
          const { loc } = sourceCode.getFirstTokens(node)[1] || {}
          // @ts-expect-error - experimental parser type
          if (specifier.type === 'ExportDefaultSpecifier') {
            context.report({
              node,
              messageId: 'preferNamed',
              loc,
            })
          } else if (specifier.type === 'ExportSpecifier') {
            context.report({
              node,
              messageId: 'noAliasDefault',
              data: {
                local: specifier.local.name,
              },
              loc,
            })
          }
        }
      },
    }
  },
})
