import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, test } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-default-export'

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-default-export', rule, {
  valid: [
    test({
      code: 'module.exports = function foo() {}',
      languageOptions: {
        parserOptions: {
          sourceType: 'script',
        },
      },
    }),
    test({
      code: 'module.exports = function foo() {}',
    }),
    test({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';
      `,
    }),
    test({
      code: `
        export const foo = 'foo';
        export function bar() {};
      `,
    }),
    test({
      code: `export const foo = 'foo';`,
    }),
    test({
      code: `
        const foo = 'foo';
        export { foo };
      `,
    }),
    test({
      code: `let foo, bar; export { foo, bar }`,
    }),
    test({
      code: `export const { foo, bar } = item;`,
    }),
    test({
      code: `export const { foo, bar: baz } = item;`,
    }),
    test({
      code: `export const { foo: { bar, baz } } = item;`,
    }),
    test({
      code: `
        let item;
        export const foo = item;
        export { item };
      `,
    }),
    test({
      code: `export * from './foo';`,
    }),
    test({
      code: `export const { foo } = { foo: "bar" };`,
    }),
    test({
      code: `export const { foo: { bar } } = { foo: { bar: "baz" } };`,
    }),
    test({
      code: 'export { a, b } from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // no exports at all
    test({
      code: `import * as foo from './foo';`,
    }),
    test({
      code: `import foo from './foo';`,
    }),
    test({
      code: `import {default as foo} from './foo';`,
    }),

    test({
      code: `export type UserId = number;`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'export foo from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: `export Memory, { MemoryValue } from './Memory'`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
  ],
  invalid: [
    test({
      code: 'export default function bar() {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration',
          message: 'Prefer named exports.',
          line: 1,
          column: 8,
        },
      ],
    }),
    test({
      code: `
        export const foo = 'foo';
        export default bar;`,
      errors: [
        {
          type: 'ExportDefaultDeclaration',
          message: 'Prefer named exports.',
          line: 3,
          column: 16,
        },
      ],
    }),
    test({
      code: 'export default class Bar {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration',
          message: 'Prefer named exports.',
          line: 1,
          column: 8,
        },
      ],
    }),
    test({
      code: 'export default function() {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration',
          message: 'Prefer named exports.',
          line: 1,
          column: 8,
        },
      ],
    }),
    test({
      code: 'export default class {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration',
          message: 'Prefer named exports.',
          line: 1,
          column: 8,
        },
      ],
    }),
    test({
      code: 'let foo; export { foo as default }',
      errors: [
        {
          type: 'ExportNamedDeclaration',
          message:
            'Do not alias `foo` as `default`. Just export `foo` itself instead.',
        },
      ],
    }),
    test({
      code: 'export default from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          type: 'ExportNamedDeclaration',
          message: 'Prefer named exports.',
        },
      ],
    }),
    test({
      code: 'let foo; export { foo as "default" }',
      errors: [
        {
          type: 'ExportNamedDeclaration',
          message:
            'Do not alias `foo` as `default`. Just export `foo` itself instead.',
        },
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
})
