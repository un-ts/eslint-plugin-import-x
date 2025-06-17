import type { TSESTree } from '@typescript-eslint/types'
import type {
  RuleContext,
  RuleListener,
} from '@typescript-eslint/utils/ts-eslint'
import { createRule } from '../utils/index.js'

export const RULE_NAME = 'prefer-namespace-import'

type Options = [
  | undefined
  | {
      patterns?: string[]
    },
]

const defaultOptions = [
  {
    patterns: [],
  },
] as const satisfies Options

export type MessageID = 'preferNamespaceImport'

export default createRule<Options, MessageID>({
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforces using namespace imports for specific modules.',
    },
    fixable: 'code',
    messages: {
      preferNamespaceImport:
        'Prefer importing {{specifier}} as \'import * as {{specifier}} from "{{source}}"\';',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          patterns: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
          },
        },
      },
    ],
  },
  name: RULE_NAME,
  create,
  defaultOptions,
})

export function create(context: RuleContext<MessageID, Options>): RuleListener {
  const patterns =
    context.options[0]?.patterns?.map(pattern => toRegExp(pattern)) ?? []
  if (patterns.length === 0) return {}
  return {
    [`ImportDeclaration ImportDefaultSpecifier`](
      node: TSESTree.ImportDefaultSpecifier,
    ) {
      const importSource = node.parent.source.value
      if (!patterns.some(pattern => pattern.test(importSource))) return
      const defaultSpecifier = node.local.name
      const hasOtherSpecifiers = node.parent.specifiers.length > 1
      context.report({
        messageId: 'preferNamespaceImport',
        node: hasOtherSpecifiers ? node : node.parent,
        data: {
          source: importSource,
          specifier: defaultSpecifier,
        },
        fix(fixer) {
          const importDeclarationText = context.sourceCode.getText(node.parent)
          const semi = importDeclarationText.endsWith(';') ? ';' : ''
          const quote = node.parent.source.raw.at(0) ?? "'"
          const isTypeImport = node.parent.importKind === 'type'
          const importStringPrefix = `import${isTypeImport ? ' type' : ''}`
          const importSourceQuoted = `${quote}${importSource}${quote}`
          if (!hasOtherSpecifiers) {
            return fixer.replaceText(
              node.parent,
              `${importStringPrefix} * as ${node.local.name} from ${importSourceQuoted}${semi}`,
            )
          }
          // dprint-ignore
          // remove the default specifier and prepend the namespace import specifier
          const specifiers = importDeclarationText.slice(
            importDeclarationText.indexOf('{'),
            importDeclarationText.indexOf('}') + 1,
          )
          return fixer.replaceText(
            node.parent,
            [
              `${importStringPrefix} * as ${node.local.name} from ${importSourceQuoted}${semi}`,
              `${importStringPrefix} ${specifiers} from ${importSourceQuoted}${semi}`,
            ].join('\n'),
          )
        },
      })
    },
  }
}

/** Regular expression for matching a RegExp string. */
const REGEXP_STR = /^\/(.+)\/([A-Za-z]*)$/u

/**
 * Convert a string to the `RegExp`. Normal strings (e.g. `"foo"`) is converted
 * to `/^foo$/` of `RegExp`. Strings like `"/^foo/i"` are converted to `/^foo/i`
 * of `RegExp`.
 *
 * @param string The string to convert.
 * @returns Returns the `RegExp`.
 * @see https://github.com/sveltejs/eslint-plugin-svelte/blob/main/packages/eslint-plugin-svelte/src/utils/regexp.ts
 */
function toRegExp(string: string): { test(s: string): boolean } {
  const [, pattern, flags = 'u'] = REGEXP_STR.exec(string) ?? []
  if (pattern != null) return new RegExp(pattern, flags)
  return { test: s => s === string }
}

/**
 * Checks whether given string is regexp string
 *
 * @param string The string to check
 * @returns Boolean
 */
// function isRegExp(string: string): boolean {
//   return Boolean(REGEXP_STR.test(string));
// }
