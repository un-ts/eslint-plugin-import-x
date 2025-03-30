import { cjsRequire as require } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { parsers, createRuleTestCaseFunctions } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-mutable-exports'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createNoMutableError(
  kind: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'noMutable', data: { kind } }
}

ruleTester.run('no-mutable-exports', rule, {
  valid: [
    tValid({ code: 'export const count = 1' }),
    tValid({ code: 'export function getCount() {}' }),
    tValid({ code: 'export class Counter {}' }),
    tValid({ code: 'export default count = 1' }),
    tValid({ code: 'export default function getCount() {}' }),
    tValid({ code: 'export default class Counter {}' }),
    tValid({ code: 'const count = 1\nexport { count }' }),
    tValid({ code: 'const count = 1\nexport { count as counter }' }),
    tValid({ code: 'const count = 1\nexport default count' }),
    tValid({ code: 'const count = 1\nexport { count as default }' }),
    tValid({ code: 'function getCount() {}\nexport { getCount }' }),
    tValid({
      code: 'function getCount() {}\nexport { getCount as getCounter }',
    }),
    tValid({ code: 'function getCount() {}\nexport default getCount' }),
    tValid({ code: 'function getCount() {}\nexport { getCount as default }' }),
    tValid({ code: 'class Counter {}\nexport { Counter }' }),
    tValid({ code: 'class Counter {}\nexport { Counter as Count }' }),
    tValid({ code: 'class Counter {}\nexport default Counter' }),
    tValid({ code: 'class Counter {}\nexport { Counter as default }' }),
    tValid({
      code: 'export Something from "./something";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'type Foo = {}\nexport type {Foo}',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'const count = 1\nexport { count as "counter" }',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
  invalid: [
    tInvalid({
      code: 'export let count = 1',
      errors: [createNoMutableError('let')],
    }),
    tInvalid({
      code: 'export var count = 1',
      errors: [createNoMutableError('var')],
    }),
    tInvalid({
      code: 'let count = 1\nexport { count }',
      errors: [createNoMutableError('let')],
    }),
    tInvalid({
      code: 'var count = 1\nexport { count }',
      errors: [createNoMutableError('var')],
    }),
    tInvalid({
      code: 'let count = 1\nexport { count as counter }',
      errors: [createNoMutableError('let')],
    }),
    tInvalid({
      code: 'var count = 1\nexport { count as counter }',
      errors: [createNoMutableError('var')],
    }),
    tInvalid({
      code: 'let count = 1\nexport default count',
      errors: [createNoMutableError('let')],
    }),
    tInvalid({
      code: 'var count = 1\nexport default count',
      errors: [createNoMutableError('var')],
    }),
    tInvalid({
      code: 'let count = 1\nexport { count as "counter" }',
      errors: [createNoMutableError('let')],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),

    // todo: undeclared globals
    // tInvalid({
    //   code: 'count = 1\nexport { count }',
    //   errors: [createNoMutableError('global binding')],
    // }),
    // tInvalid({
    //   code: 'count = 1\nexport default count',
    //   errors: [createNoMutableError('global binding')],
    // }),
  ],
})
