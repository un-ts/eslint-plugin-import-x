import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers } from '../utils'

import rule from 'eslint-plugin-import-x/rules/unambiguous'

const ruleTester = new TSESLintRuleTester()

ruleTester.run('unambiguous', rule, {
  valid: [
    {
      code: 'function x() {}',
      languageOptions: {
        parserOptions: { sourceType: 'commonjs' },
      },
    },
    {
      code: '"use strict"; function y() {}',
      languageOptions: {
        parserOptions: { sourceType: 'commonjs' },
      },
    },
    {
      code: 'import y from "z"; function x() {}',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'import * as y from "z"; function x() {}',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'import { y } from "z"; function x() {}',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'import z, { y } from "z"; function x() {}',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'function x() {}; export {}',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'function x() {}; export { x }',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'function x() {}; export { y } from "z"',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'function x() {}; export * as y from "z"',
      languageOptions: {
        parser: require(parsers.BABEL),
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: 'export function x() {}',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
  ],
  invalid: [
    {
      code: 'function x() {}',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
      output: null,
      errors: [
        {
          messageId: 'module',
        },
      ],
    },
  ],
})
