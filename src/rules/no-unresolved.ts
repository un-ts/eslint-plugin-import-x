/**
 * Ensures that an imported path exists, given resolution rules.
 */

import {
  CASE_SENSITIVE_FS,
  fileExistsWithCaseSync,
  resolve,
} from '../utils/resolve'
import { ModuleCache } from '../utils/ModuleCache'
import {
  ModuleOptions,
  makeOptionsSchema,
  moduleVisitor,
} from '../utils/moduleVisitor'
import { createRule } from '../utils'

type Options = [
  ModuleOptions & {
    caseSensitive?: boolean
    caseSensitiveStrict?: boolean
  },
]

type MessageId = 'unresolved' | 'casingMismatch'

export = createRule<Options, MessageId>({
  name: 'no-unresolved',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description:
        'Ensure imports point to a file/module that can be resolved.',
      recommended: 'error',
    },
    messages: {
      unresolved: "Unable to resolve path to module '{{module}}'.",
      casingMismatch:
        "Casing of '{{module}}' does not match the underlying filesystem.",
    },
    schema: [
      makeOptionsSchema({
        caseSensitive: { type: 'boolean', default: true },
        caseSensitiveStrict: { type: 'boolean' },
      }),
    ],
  },
  defaultOptions: [
    {
      caseSensitive: true,
    },
  ],
  create(context) {
    const options = context.options[0] || {}

    return moduleVisitor(function checkSourceValue(source, node) {
      // ignore type-only imports and exports
      if (
        ('importKind' in node && node.importKind === 'type') ||
        ('exportKind' in node && node.exportKind === 'type')
      ) {
        return
      }

      const caseSensitive =
        !CASE_SENSITIVE_FS && options.caseSensitive !== false
      const caseSensitiveStrict =
        !CASE_SENSITIVE_FS && options.caseSensitiveStrict

      const resolvedPath = resolve(source.value, context)

      if (resolvedPath === undefined) {
        context.report({
          node: source,
          messageId: 'unresolved',
          data: {
            module: source.value,
          },
        })
      } else if (caseSensitive || caseSensitiveStrict) {
        const cacheSettings = ModuleCache.getSettings(context.settings)
        if (
          !fileExistsWithCaseSync(
            resolvedPath,
            cacheSettings,
            caseSensitiveStrict,
          )
        ) {
          context.report({
            node: source,
            messageId: 'casingMismatch',
            data: {
              module: source.value,
            },
          })
        }
      }
    }, options)
  },
})
