import { createRule } from '../utils'
import sourceType from '../utils/source-type'

export = createRule({
  name: 'no-named-export',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Forbid named exports.',
    },
    schema: [],
    messages: {
      noAllowed: 'Named exports are not allowed.',
    },
  },
  defaultOptions: [],
  create(context) {
    // ignore non-modules
    if (sourceType(context) !== 'module') {
      return {}
    }

    return {
      ExportAllDeclaration(node) {
        context.report({ node, messageId: 'noAllowed' })
      },

      ExportNamedDeclaration(node) {
        if (node.specifiers.length === 0) {
          return context.report({ node, messageId: 'noAllowed' })
        }

        const someNamed = node.specifiers.some(
          specifier =>
            (specifier.exported.name ||
              ('value' in specifier.exported && specifier.exported.value)) !==
            'default',
        )
        if (someNamed) {
          context.report({ node, messageId: 'noAllowed' })
        }
      },
    }
  },
})
