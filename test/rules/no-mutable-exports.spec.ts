import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, test } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-mutable-exports'

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-mutable-exports', rule, {
  valid: [
    test({ code: 'export const count = 1' }),
    test({ code: 'export function getCount() {}' }),
    test({ code: 'export class Counter {}' }),
    test({ code: 'export default count = 1' }),
    test({ code: 'export default function getCount() {}' }),
    test({ code: 'export default class Counter {}' }),
    test({ code: 'const count = 1\nexport { count }' }),
    test({ code: 'const count = 1\nexport { count as counter }' }),
    test({ code: 'const count = 1\nexport default count' }),
    test({ code: 'const count = 1\nexport { count as default }' }),
    test({ code: 'function getCount() {}\nexport { getCount }' }),
    test({ code: 'function getCount() {}\nexport { getCount as getCounter }' }),
    test({ code: 'function getCount() {}\nexport default getCount' }),
    test({ code: 'function getCount() {}\nexport { getCount as default }' }),
    test({ code: 'class Counter {}\nexport { Counter }' }),
    test({ code: 'class Counter {}\nexport { Counter as Count }' }),
    test({ code: 'class Counter {}\nexport default Counter' }),
    test({ code: 'class Counter {}\nexport { Counter as default }' }),
    test({
      languageOptions: { parser: require(parsers.BABEL) },
      code: 'export Something from "./something";',
    }),
    test({
      languageOptions: { parser: require(parsers.BABEL) },
      code: 'type Foo = {}\nexport type {Foo}',
    }),
    test({
      code: 'const count = 1\nexport { count as "counter" }',
      languageOptions: { parserOptions: { ecmaVersion: 2022 } },
    }),
  ],
  invalid: [
    test({
      code: 'export let count = 1',
      errors: ["Exporting mutable 'let' binding, use 'const' instead."],
    }),
    test({
      code: 'export var count = 1',
      errors: ["Exporting mutable 'var' binding, use 'const' instead."],
    }),
    test({
      code: 'let count = 1\nexport { count }',
      errors: ["Exporting mutable 'let' binding, use 'const' instead."],
    }),
    test({
      code: 'var count = 1\nexport { count }',
      errors: ["Exporting mutable 'var' binding, use 'const' instead."],
    }),
    test({
      code: 'let count = 1\nexport { count as counter }',
      errors: ["Exporting mutable 'let' binding, use 'const' instead."],
    }),
    test({
      code: 'var count = 1\nexport { count as counter }',
      errors: ["Exporting mutable 'var' binding, use 'const' instead."],
    }),
    test({
      code: 'let count = 1\nexport default count',
      errors: ["Exporting mutable 'let' binding, use 'const' instead."],
    }),
    test({
      code: 'var count = 1\nexport default count',
      errors: ["Exporting mutable 'var' binding, use 'const' instead."],
    }),
    test({
      code: 'let count = 1\nexport { count as "counter" }',
      errors: ["Exporting mutable 'let' binding, use 'const' instead."],
      languageOptions: { parserOptions: { ecmaVersion: 2022 } },
    }),

    // todo: undeclared globals
    // test({
    //   code: 'count = 1\nexport { count }',
    //   errors: ['Exporting mutable global binding, use \'const\' instead.'],
    // }),
    // test({
    //   code: 'count = 1\nexport default count',
    //   errors: ['Exporting mutable global binding, use \'const\' instead.'],
    // }),
  ],
})
