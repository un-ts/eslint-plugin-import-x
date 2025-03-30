import type { TSESTree } from '@typescript-eslint/utils'

import { importDeclaration, ExportMap, createRule } from '../utils/index.js'

type MessageId = 'default'

export default createRule<[], MessageId>({
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
    function createCheckDefault(nameKey: 'local' | 'exported') {
      return function checkDefault(
        defaultSpecifier: TSESTree.ImportDefaultSpecifier,
        // | TSESTree.ExportDefaultSpecifier,
      ) {
        // #566: default is a valid specifier
        // @ts-expect-error - ExportDefaultSpecifier is unavailable yet
        const nameValue = defaultSpecifier[nameKey].name as string

        if (nameValue === 'default') {
          return
        }

        const declaration = importDeclaration(context, defaultSpecifier)

        const exportMapOfImported = ExportMap.get(
          declaration.source.value,
          context,
        )
        if (exportMapOfImported == null) {
          return
        }

        if (exportMapOfImported.errors.length > 0) {
          exportMapOfImported.reportErrors(context, declaration)
          return
        }

        if (!exportMapOfImported.hasDefault) {
          // The rule is triggered for default imports/exports, so if the imported module has no default
          // this means we're dealing with incorrect source code anyway
          return
        }

        if (!exportMapOfImported.has(nameValue)) {
          // The name used locally for the default import was not even used in the imported module.
          return
        }

        if (
          exportMapOfImported.exports.has('default') &&
          exportMapOfImported.exports.has(nameValue)
        ) {
          context.report({
            node: defaultSpecifier,
            messageId: 'default',
            data: {
              name: nameValue,
            },
          })
        }
      }
    }
    return {
      ImportDefaultSpecifier: createCheckDefault('local'),
      ExportDefaultSpecifier: createCheckDefault('exported'),
    }
  },
})
