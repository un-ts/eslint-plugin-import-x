import type { TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

function getEmptyBlockRange(tokens: TSESTree.Token[], index: number) {
  const token = tokens[index]
  const nextToken = tokens[index + 1]
  const prevToken = tokens[index - 1]
  let start = token.range[0]
  const end = nextToken.range[1]

  // Remove block tokens and the previous comma
  if (
    prevToken.value === ',' ||
    prevToken.value === 'type' ||
    prevToken.value === 'typeof'
  ) {
    start = prevToken.range[0]
  }

  return [start, end] as const
}

export = createRule({
  name: 'no-empty-named-blocks',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Helpful warnings',
      description: 'Forbid empty named import blocks.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
    messages: {
      emptyNamed: 'Unexpected empty named import block',
      unused: 'Remove unused import',
      emptyImport: 'Remove empty import block',
    },
  },
  defaultOptions: [],
  create(context) {
    const importsWithoutNameds: TSESTree.ImportDeclaration[] = []

    return {
      ImportDeclaration(node) {
        if (!node.specifiers.some(x => x.type === 'ImportSpecifier')) {
          importsWithoutNameds.push(node)
        }
      },

      'Program:exit'(program: TSESTree.Program) {
        const importsTokens = importsWithoutNameds.map(
          node =>
            [
              node,
              program.tokens!.filter(
                x => x.range[0] >= node.range[0] && x.range[1] <= node.range[1],
              ),
            ] as const,
        )

        const pTokens = program.tokens || []

        for (const [node, tokens] of importsTokens) {
          for (const token of tokens) {
            const idx = pTokens.indexOf(token)
            const nextToken = pTokens[idx + 1]

            if (nextToken && token.value === '{' && nextToken.value === '}') {
              const hasOtherIdentifiers = tokens.some(
                token =>
                  token.type === 'Identifier' &&
                  token.value !== 'from' &&
                  token.value !== 'type' &&
                  token.value !== 'typeof',
              )

              // If it has no other identifiers it's the only thing in the import, so we can either remove the import
              // completely or transform it in a side-effects only import
              if (hasOtherIdentifiers) {
                context.report({
                  node,
                  messageId: 'emptyNamed',
                  fix(fixer) {
                    return fixer.removeRange(getEmptyBlockRange(pTokens, idx))
                  },
                })
              } else {
                context.report({
                  node,
                  messageId: 'emptyNamed',
                  suggest: [
                    {
                      messageId: 'unused',
                      fix(fixer) {
                        // Remove the whole import
                        return fixer.remove(node)
                      },
                    },
                    {
                      messageId: 'emptyImport',
                      fix(fixer) {
                        // Remove the empty block and the 'from' token, leaving the import only for its side
                        // effects, e.g. `import 'mod'`
                        const sourceCode = context.getSourceCode()
                        const fromToken = pTokens.find(t => t.value === 'from')!
                        const importToken = pTokens.find(
                          t => t.value === 'import',
                        )!
                        const hasSpaceAfterFrom = sourceCode.isSpaceBetween!(
                          fromToken,
                          sourceCode.getTokenAfter(fromToken)!,
                        )
                        const hasSpaceAfterImport = sourceCode.isSpaceBetween!(
                          importToken,
                          sourceCode.getTokenAfter(fromToken)!,
                        )

                        const [start] = getEmptyBlockRange(pTokens, idx)
                        const [, end] = fromToken.range
                        const range = [
                          start,
                          hasSpaceAfterFrom ? end + 1 : end,
                        ] as const

                        return fixer.replaceTextRange(
                          range,
                          hasSpaceAfterImport ? '' : ' ',
                        )
                      },
                    },
                  ],
                })
              }
            }
          }
        }
      },
    }
  },
})
