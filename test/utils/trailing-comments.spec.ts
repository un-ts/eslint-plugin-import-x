import * as tsParser from '@typescript-eslint/parser'
import { TSESLint } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'

import { getTrailingComments } from 'eslint-plugin-import-x/utils'

const collect = (code: string) => {
  let result: string[] = []
  // ESLint 8 defaults to eslintrc mode, which ignores the flat config below
  const linter = new TSESLint.Linter({ configType: 'flat' })
  linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        plugins: {
          t: {
            rules: {
              r: {
                create: (context: TSESLint.RuleContext<string, []>) => ({
                  Program: (node: TSESTree.Program) => {
                    result = getTrailingComments(
                      context.sourceCode,
                      node.body[0],
                    ).map(comment => comment.value)
                  },
                }),
              },
            },
          },
        },
        rules: { 't/r': 'error' },
        languageOptions: {
          parser: tsParser,
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    ],
    { filename: 'a.ts' },
  )
  return result
}

describe(getTrailingComments, () => {
  it('collects comments on the same line, including chained ones', () => {
    expect(collect("import a from 'a' // c\nimport b from 'b'")).toEqual([' c'])
    expect(
      collect("import a from 'a' /* c */ /* d */\nimport b from 'b'"),
    ).toHaveLength(2)
    expect(collect("import a from 'a'\n// c\nimport b from 'b'")).toHaveLength(
      0,
    )
  })
})
