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
      description: 'Enforces using namespace imports for specific modules.',
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
            const importDeclarationText = context.sourceCode.getText(
              node.parent,
            )
            const localName = node.local.name
            if (!hasOtherSpecifiers) {
              return fixer.replaceText(node, `* as ${localName}`)
            }
            const isTypeImport = node.parent.importKind === 'type'
            const importStringPrefix = `import${isTypeImport ? ' type' : ''}`
            // remove the default specifier and prepend the namespace import specifier
            const rightBraceIndex = importDeclarationText.indexOf('}') + 1
            const specifiers = importDeclarationText.slice(
              importDeclarationText.indexOf('{'),
              rightBraceIndex,
            )
            const remainingText = importDeclarationText.slice(rightBraceIndex)
            return fixer.replaceText(
              node.parent,
              [
                `${importStringPrefix} * as ${localName} ${remainingText.trimStart()}`,
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
