import * as tsParser from '@typescript-eslint/parser'
import { TSESLint } from '@typescript-eslint/utils'
import type { TSESTree } from '@typescript-eslint/utils'

import {
  getLeadingComments,
  getTrailingComments,
} from 'eslint-plugin-import-x/utils'

const collect = (
  code: string,
  get: typeof getTrailingComments = getTrailingComments,
  index = 0,
) => {
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
                    result = get(context.sourceCode, node.body[index]).map(
                      comment => comment.value,
                    )
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

const leading = (code: string) => collect(code, getLeadingComments, 1)

describe(getLeadingComments, () => {
  it('collects the comment lines directly above the node, in order', () => {
    expect(
      leading("import a from 'a'\n// c\n/* d */\nimport b from 'b'"),
    ).toEqual([' c', ' d '])
  })

  it('does not collect a @ts-nocheck or @ts-check at the start of the file', () => {
    expect(
      collect("// @ts-nocheck\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(0)
    expect(
      collect("// @ts-check\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(0)
    // next-line directives (like @ts-expect-error) should still be collected
    expect(
      collect("// @ts-expect-error\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(1)
  })

  it('does not collect @ts-nocheck when preceded only by other comments', () => {
    // license comment before the pragma: pragma is still file-level
    expect(
      collect(
        "// Copyright 2024\n// @ts-nocheck\nimport b from 'b'",
        getLeadingComments,
        0,
      ),
    ).toHaveLength(0)
    // block comment license header
    expect(
      collect(
        "/* license */\n// @ts-check\nimport b from 'b'",
        getLeadingComments,
        0,
      ),
    ).toHaveLength(0)
  })

  it('recognizes @ts-nocheck and @ts-check case-insensitively', () => {
    expect(
      collect("// @TS-NOCHECK\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(0)
    expect(
      collect("// @Ts-Check\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(0)
    // TypeScript allows explanatory text after the pragma name; treat it as file-level too
    expect(
      collect(
        "// @ts-nocheck see issue #123\nimport b from 'b'",
        getLeadingComments,
        0,
      ),
    ).toHaveLength(0)
  })

  it('recognizes a pragma with a colon before its explanation', () => {
    expect(
      collect(
        "// @ts-nocheck: legacy\nimport b from 'b'",
        getLeadingComments,
        0,
      ),
    ).toHaveLength(0)
    expect(
      collect("/// @ts-check:strict\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(0)
  })

  it('does not collect a pragma that follows code', () => {
    expect(
      leading("import a from 'a'\n// @ts-nocheck\nimport b from 'b'"),
    ).toHaveLength(0)
    expect(
      leading("import a from 'a'\n// c\n// @ts-check\nimport b from 'b'"),
    ).toHaveLength(0)
  })

  it('recognizes the triple-slash form of @ts-nocheck and @ts-check', () => {
    expect(
      collect("/// @ts-nocheck\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(0)
    expect(
      collect("/// @ts-check\nimport b from 'b'", getLeadingComments, 0),
    ).toHaveLength(0)
  })

  it('stops at a blank line or a comment that ends another line', () => {
    expect(
      leading("import a from 'a'\n// c\n\nimport b from 'b'"),
    ).toHaveLength(0)
    expect(leading("import a from 'a' // c\nimport b from 'b'")).toHaveLength(0)
    expect(
      leading("import a from 'a' /* c\n */\n// d\nimport b from 'b'"),
    ).toEqual([' d'])
  })
})
