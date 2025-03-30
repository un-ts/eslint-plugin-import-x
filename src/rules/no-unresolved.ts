/**
 * Ensures that an imported path exists, given resolution rules.
 */

import type { ModuleOptions } from '../utils/index.js'
import {
  createRule,
  makeOptionsSchema,
  moduleVisitor,
  CASE_SENSITIVE_FS,
  fileExistsWithCaseSync,
  resolve,
  ModuleCache,
} from '../utils/index.js'

export type Options = ModuleOptions & {
  caseSensitive?: boolean
  caseSensitiveStrict?: boolean
}

export type MessageId = 'unresolved' | 'casingMismatch'

export default createRule<[Options?], MessageId>({
  name: 'no-unresolved',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description:
        'Ensure imports point to a file/module that can be resolved.',
    },
    schema: [
      makeOptionsSchema({
        caseSensitive: { type: 'boolean', default: true },
        caseSensitiveStrict: { type: 'boolean' },
      }),
    ],
    messages: {
      unresolved: "Unable to resolve path to module '{{module}}'.",
      casingMismatch:
        'Casing of {{module}} does not match the underlying filesystem.',
    },
  },
  defaultOptions: [],
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
