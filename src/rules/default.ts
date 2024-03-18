import type { TSESTree } from '@typescript-eslint/utils'

import { ExportMap, createRule } from '../utils'

type MessageId = 'noDefaultExport'

export = createRule<[], MessageId>({
  name: 'default',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description:
        'Ensure a default export is present, given a default import.',
    },
    schema: [],
    messages: {
      noDefaultExport:
        'No default export found in imported module "{{module}}".',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkDefault(
      specifierType: 'ImportDefaultSpecifier' | 'ExportDefaultSpecifier',
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
    ) {
      const defaultSpecifier = (
        node.specifiers as Array<
          TSESTree.ImportClause | TSESTree.ExportSpecifier
        >
      ).find(specifier => specifier.type === specifierType)

      if (!defaultSpecifier) {
        return
      }
      const imports = ExportMap.get(node.source!.value, context)
      if (imports == null) {
        return
      }

      if (imports.errors.length) {
        imports.reportErrors(context, node)
      } else if (imports.get('default') === undefined) {
        context.report({
          node: defaultSpecifier,
          messageId: 'noDefaultExport',
          data: {
            module: node.source!.value,
          },
        })
      }
    }

    return {
      ImportDeclaration: checkDefault.bind(null, 'ImportDefaultSpecifier'),
      ExportNamedDeclaration: checkDefault.bind(null, 'ExportDefaultSpecifier'),
    }
  },
})
