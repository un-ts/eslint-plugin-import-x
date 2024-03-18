import type { TSESTree } from '@typescript-eslint/utils'

import { importDeclaration } from '../import-declaration'
import { ExportMap, createRule } from '../utils'

type MessageId = 'default'

export = createRule<[], MessageId>({
  name: 'no-named-as-default',
  meta: {
    type: 'problem',
    docs: {
      category: 'Helpful warnings',
      description:
        'Forbid use of exported name as identifier of default export.',
    },
    schema: [],
    messages: {
      default:
        "Using exported name '{{name}}' as identifier for default export.",
    },
  },
  defaultOptions: [],
  create(context) {
    function checkDefault(
      nameKey: 'local' | 'exported',
      defaultSpecifier: TSESTree.ImportDefaultSpecifier,
      // | TSESTree.ExportDefaultSpecifier,
    ) {
      // #566: default is a valid specifier
      // @ts-expect-error - ExportDefaultSpecifier is unavailable yet
      const nameValue = defaultSpecifier[nameKey].name as string

      if (nameValue === 'default') {
        return
      }

      const declaration = importDeclaration(context)

      const imports = ExportMap.get(declaration.source.value, context)
      if (imports == null) {
        return
      }

      if (imports.errors.length) {
        imports.reportErrors(context, declaration)
        return
      }

      if (imports.has('default') && imports.has(nameValue)) {
        context.report({
          node: defaultSpecifier,
          messageId: 'default',
          data: {
            name: nameValue,
          },
        })
      }
    }
    return {
      ImportDefaultSpecifier: checkDefault.bind(null, 'local'),
      ExportDefaultSpecifier: checkDefault.bind(null, 'exported'),
    }
  },
})
