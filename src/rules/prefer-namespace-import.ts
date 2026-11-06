import { createRule } from '../utils/index.js'

export interface Options {
  patterns?: readonly string[]
}

export type MessageId = 'preferNamespaceImport'

export default createRule<[Options?], MessageId>({
  name: 'prefer-namespace-import',
  meta: {
    type: 'problem',
    docs: {
      category: 'Style guide',
      description:
        'Enforce using namespace imports for specific modules, like `react`/`react-dom`, etc.',
    },
    fixable: 'code',
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
    messages: {
      preferNamespaceImport:
        'Prefer importing {{specifier}} as \'import * as {{specifier}} from "{{source}}"\';',
    },
  },
  defaultOptions: [],
  create(context) {
    const { patterns } = context.options[0] ?? {}
    if (!patterns?.length) {
      return {}
    }
    const regexps = patterns.map(toRegExp)
    return {
      ImportDefaultSpecifier(node) {
        const importSource = node.parent.source.value
        if (!regexps.some(exp => exp.test(importSource))) {
          return
        }
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
            const localName = node.local.name
            if (!hasOtherSpecifiers) {
              return fixer.replaceText(node, `* as ${localName}`)
            }
            const isTypeImport = node.parent.importKind === 'type'
            const importStringPrefix = `import${isTypeImport ? ' type' : ''}`
            // remove the default specifier and prepend the namespace import specifier.
            // The other specifiers are either `{ ... }` or `* as name`, so take
            // everything between the comma after the default and `from`. The text
            // before `from` is kept as written, so a `//` comment there still ends
            // before `from`.
            const { sourceCode } = context
            const comma = sourceCode.getTokenAfter(node)!
            const fromToken = sourceCode.getTokenBefore(node.parent.source)!
            const specifiers = sourceCode.text
              .slice(comma.range[1], fromToken.range[0])
              .trimStart()
            // keep anything between the default specifier and the comma, such as
            // a comment, with the new namespace import
            const afterDefault = sourceCode.text
              .slice(node.range[1], comma.range[0])
              .trimEnd()
            // a `//` comment there has to end before `from`
            const beforeFrom =
              sourceCode.getCommentsBefore(comma).at(-1)?.type === 'Line'
                ? '\n'
                : ' '
            const remainingText = sourceCode.text.slice(
              fromToken.range[0],
              node.parent.range[1],
            )
            return fixer.replaceText(
              node.parent,
              [
                `${importStringPrefix} * as ${localName}${afterDefault}${beforeFrom}${remainingText}`,
                `${importStringPrefix} ${specifiers}${remainingText}`,
              ].join('\n'),
            )
          },
        })
      },
    }
  },
})

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
  if (pattern != null) {
    return new RegExp(pattern, flags)
  }
  return { test: s => s === string }
}
