import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  getNonDefaultParsers,
  parsers,
} from '../utils.js'

import { cjsRequire as require } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/prefer-namespace-import'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

describe('TypeScript', () => {
  for (const parser of getNonDefaultParsers()) {
    const parserConfig = {
      languageOptions: {
        ...(parser === parsers.BABEL && {
          parser: require<TSESLint.Parser.LooseParserModule>(parsers.BABEL),
        }),
      },
      settings: {
        'import-x/parsers': { [parsers.TS]: ['.ts'] },
        'import-x/resolver': { 'eslint-import-resolver-typescript': true },
      },
    }

    ruleTester.run('prefer-namespace-import', rule, {
      valid: [
        tValid({
          code: `
          import * as Name from '@scope/name';
          `,
          ...parserConfig,
        }),
        tValid({
          code: `
          import * as Name from 'prefix-name';
          `,
          ...parserConfig,
        }),
        tValid({
          code: `
          import * as Name1 from '@scope/name';
          import * as Name2 from 'prefix-name';
          `,
          ...parserConfig,
        }),
      ],
      invalid: [
        tInvalid({
          code: `
          import Name1 from '@scope/name';
          import Name2 from 'prefix-name';`,
          errors: [
            {
              messageId: "preferNamespaceImport",
              data: { source: "@scope/name", specifier: "Name1" },
            },
            {
              messageId: "preferNamespaceImport",
              data: { source: "prefix-name", specifier: "Name2" },
            },
          ],
          options: [
            {
              patterns: ["/^@scope/", "/^prefix-/"],
            },
          ],
          output: `
          import * as Name1 from '@scope/name';
          import * as Name2 from 'prefix-name';`,
        })
      ],
    })
  }
})
