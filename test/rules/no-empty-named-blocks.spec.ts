import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, test } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-empty-named-blocks'

const ruleTester = new TSESLintRuleTester()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateSuggestionsTestCases(cases: string[], parser?: any) {
  return cases.map(code =>
    test({
      code,
      languageOptions: {
        ...(parser && { parser }),
      },
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
    test({ code: `import 'mod';` }),
    test({ code: `import Default from 'mod';` }),
    test({ code: `import { Named } from 'mod';` }),
    test({ code: `import Default, { Named } from 'mod';` }),
    test({ code: `import * as Namespace from 'mod';` }),

    // Typescript
    test({ code: `import type Default from 'mod';` }),
    test({
      code: `import type { Named } from 'mod';`,
    }),
    test({
      code: `import type Default, { Named } from 'mod';`,
    }),
    test({
      code: `import type * as Namespace from 'mod';`,
    }),

    // Flow
    test({
      code: `import typeof Default from 'mod'; // babel old`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: `import typeof { Named } from 'mod'; // babel old`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: `import typeof Default, { Named } from 'mod'; // babel old`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: `
        module.exports = {
          rules: {
            'keyword-spacing': ['error', {overrides: {}}],
          }
        };
      `,
    }),
    test({
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
    test({
      code: `import Default, {} from 'mod';`,
      output: `import Default from 'mod';`,
      errors: ['Unexpected empty named import block'],
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
    test({
      code: `import type Default, {} from 'mod';`,
      output: `import type Default from 'mod';`,

      errors: ['Unexpected empty named import block'],
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
    test({
      code: `import typeof Default, {} from 'mod';`,
      output: `import typeof Default from 'mod';`,
      languageOptions: { parser: require(parsers.BABEL) },
      errors: ['Unexpected empty named import block'],
    }),
  ],
})
