import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'

import { parsers, createRuleTestCaseFunctions } from '../utils.js'

import { cjsRequire as require } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/no-empty-named-blocks'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function generateSuggestionsTestCases(
  cases: string[],
  parser?: TSESLint.Parser.LooseParserModule,
): Array<ReturnType<typeof tInvalid>> {
  return cases.map(code =>
    tInvalid({
      code,
      languageOptions: { parser },
      errors: [
        {
          messageId: 'emptyNamed',
          suggestions: [
            {
              messageId: 'unused',
              output: '',
            },
            {
              messageId: 'emptyImport',
              output: `import 'mod';`,
            },
          ],
        },
      ],
    }),
  )
}

ruleTester.run('no-empty-named-blocks', rule, {
  valid: [
    tValid({ code: `import 'mod';` }),
    tValid({ code: `import Default from 'mod';` }),
    tValid({ code: `import { Named } from 'mod';` }),
    tValid({ code: `import Default, { Named } from 'mod';` }),
    tValid({ code: `import * as Namespace from 'mod';` }),

    // Typescript
    tValid({ code: `import type Default from 'mod';` }),
    tValid({
      code: `import type { Named } from 'mod';`,
    }),

    tValid({
      code: `import type Default, { Named } from 'mod';`,
      // TS Parse Error: A type-only import can specify a default import or named bindings, but not both.
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `import type * as Namespace from 'mod';`,
    }),

    // Flow
    tValid({
      code: `import typeof Default from 'mod'; // babel old`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `import typeof { Named } from 'mod'; // babel old`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `import typeof Default, { Named } from 'mod'; // babel old`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `
        module.exports = {
          rules: {
            'keyword-spacing': ['error', {overrides: {}}],
          }
        };
      `,
    }),
    tValid({
      code: `
        import { DESCRIPTORS, NODE } from '../helpers/constants';
        // ...
        import { timeLimitedPromise } from '../helpers/helpers';
        // ...
        import { DESCRIPTORS2 } from '../helpers/constants';
      `,
    }),
  ],
  invalid: [
    tInvalid({
      code: `import Default, {} from 'mod';`,
      output: `import Default from 'mod';`,
      errors: [{ messageId: 'emptyNamed' }],
    }),
    ...generateSuggestionsTestCases([
      `import {} from 'mod';`,
      `import{}from'mod';`,
      `import {} from'mod';`,
      `import {}from 'mod';`,
    ]),

    // Typescript
    ...generateSuggestionsTestCases([
      `import type {} from 'mod';`,
      `import type {}from 'mod';`,
      `import type{}from 'mod';`,
      `import type {}from'mod';`,
    ]),
    tInvalid({
      code: `import type Default, {} from 'mod';`,
      output: `import type Default from 'mod';`,

      // TS Parse Error: A type-only import can specify a default import or named bindings, but not both.
      languageOptions: { parser: require(parsers.BABEL) },

      errors: [{ messageId: 'emptyNamed' }],
    }),

    // Flow
    ...generateSuggestionsTestCases(
      [
        `import typeof {} from 'mod';`,
        `import typeof {}from 'mod';`,
        `import typeof {} from'mod';`,
        `import typeof{}from'mod';`,
      ],
      require(parsers.BABEL),
    ),
    tInvalid({
      code: `import typeof Default, {} from 'mod';`,
      output: `import typeof Default from 'mod';`,
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [{ messageId: 'emptyNamed' }],
    }),
  ],
})
