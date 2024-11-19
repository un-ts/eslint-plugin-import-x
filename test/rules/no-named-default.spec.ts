import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  SYNTAX_VALID_CASES,
  parsers,
} from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-named-default'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('no-named-default', rule, {
  valid: [
    tValid({ code: 'import bar from "./bar";' }),
    tValid({ code: 'import bar, { foo } from "./bar";' }),

    // Should ignore imported flow types
    tValid({
      code: 'import { type default as Foo } from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { typeof default as Foo } from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    ...SYNTAX_VALID_CASES,
  ],

  invalid: [
    // tInvalid({
    //   code: 'import { default } from "./bar";',
    //   errors: [
    //     {
    //       messageId: 'default',
    //       data: { importName: 'default' },
    //       type: AST_NODE_TYPES.Identifier,
    //     },
    //   ],
    //   languageOptions: { parser: require(parsers.BABEL) },
    // }),
    tInvalid({
      code: 'import { default as bar } from "./bar";',
      errors: [
        {
          messageId: 'default',
          data: { importName: 'bar' },
          type: AST_NODE_TYPES.Identifier,
        },
      ],
    }),
    tInvalid({
      code: 'import { foo, default as bar } from "./bar";',
      errors: [
        {
          messageId: 'default',
          data: { importName: 'bar' },
          type: AST_NODE_TYPES.Identifier,
        },
      ],
    }),

    tInvalid({
      code: 'import { "default" as bar } from "./bar";',
      errors: [
        {
          messageId: 'default',
          data: { importName: 'bar' },
          type: AST_NODE_TYPES.Identifier,
        },
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: {
          ecmaVersion: 2022,
        },
      },
    }),
  ],
})
