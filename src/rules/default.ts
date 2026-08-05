import type { TSESTree } from '@typescript-eslint/utils'

import { ModuleInfo } from '../core/index.js'
import { createRule } from '../utils/index.js'
import { reportModuleParseErrors } from '../utils/report-module-parse-errors.js'

export type MessageId = 'noDefaultExport'

export default createRule<[], MessageId>({
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
      const imports = ModuleInfo.get(node.source!.value, context)
      if (imports == null) {
        return
      }

      if (imports.parseError) {
        reportModuleParseErrors(context, imports, node)
      } else if (imports.getExport('default') === undefined) {
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
