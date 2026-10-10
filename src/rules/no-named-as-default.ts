import type { TSESTree } from '@typescript-eslint/utils'

import {
  hasDefaultExport,
  hasExplicitExport,
  ModuleInfo,
} from '../core/index.js'
import { importDeclaration, createRule } from '../utils/index.js'
import { reportModuleParseErrors } from '../utils/report-module-parse-errors.js'

export type MessageId = 'default'

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

        const importedModule = ModuleInfo.get(declaration.source.value, context)

        if (importedModule == null) {
          return
        }

        if (importedModule.parseError) {
          reportModuleParseErrors(context, importedModule, declaration)
          return
        }

        if (!hasDefaultExport(importedModule)) {
          // The rule is triggered for default imports/exports, so if the imported module has no default
          // this means we're dealing with incorrect source code anyway
          return
        }

        if (!importedModule.hasExport(nameValue)) {
          // The name used locally for the default import was not even used in the imported module.
          return
        }

        if (
          hasExplicitExport(importedModule, 'default') &&
          hasExplicitExport(importedModule, nameValue)
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
