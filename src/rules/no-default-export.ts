import { createRule } from '../utils'

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
    if (context.parserOptions.sourceType !== 'module') {
      return {}
    }

    return {
      ExportDefaultDeclaration(node) {
        const { loc } = context.getSourceCode().getFirstTokens(node)[1] || {}
        context.report({
          node,
          messageId: 'preferNamed',
          loc,
        })
      },

      ExportNamedDeclaration(node) {
        node.specifiers
          .filter(
            specifier =>
              (specifier.exported.name ||
                ('value' in specifier.exported && specifier.exported.value)) ===
              'default',
          )
          .forEach(specifier => {
            const { loc } =
              context.getSourceCode().getFirstTokens(node)[1] || {}
            // @ts-expect-error - legacy parser type
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
          })
      },
    }
  },
})
