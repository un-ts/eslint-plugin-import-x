import { createRule } from '../utils'

type MessageId = 'default'

export = createRule<[], MessageId>({
  name: 'no-named-default',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Forbid named default exports.',
    },
    schema: [],
    messages: {
      default: `Use default import syntax to import '{{importName}}'.`,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        for (const im of node.specifiers) {
          if (
            'importKind' in im &&
            (im.importKind === 'type' ||
              // @ts-expect-error - flow type
              im.importKind === 'typeof')
          ) {
            continue
          }

          if (
            im.type === 'ImportSpecifier' &&
            (im.imported.name ||
              // @ts-expect-error - legacy parser type
              im.imported.value) === 'default'
          ) {
            context.report({
              node: im.local,
              messageId: 'default',
              data: {
                importName: im.local.name,
              },
            })
          }
        }
      },
    }
  },
})
