import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { test, getNonDefaultParsers, parsers } from '../utils'

import rule from 'eslint-plugin-import-x/rules/prefer-default-export'

const ruleTester = new TSESLintRuleTester()

// test cases for default option { target: 'single' }
ruleTester.run('prefer-default-export', rule, {
  valid: [
    test({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';`,
    }),
    test({
      code: `
        export default function bar() {};`,
    }),
    test({
      code: `
        export const foo = 'foo';
        export function bar() {};`,
    }),
    test({
      code: `
        export const foo = 'foo';
        export default bar;`,
    }),
    test({
      code: `
        let foo, bar;
        export { foo, bar }`,
    }),
    test({
      code: `
        export const { foo, bar } = item;`,
    }),
    test({
      code: `
        export const { foo, bar: baz } = item;`,
    }),
    test({
      code: `
        export const { foo: { bar, baz } } = item;`,
    }),
    test({
      code: `
        export const [a, b] = item;`,
    }),
    test({
      code: `
        let item;
        export const foo = item;
        export { item };`,
    }),
    test({
      code: `
        let foo;
        export { foo as default }`,
    }),
    test({
      code: `
        export * from './foo';`,
    }),
    test({
      code: `export Memory, { MemoryValue } from './Memory'`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // no exports at all
    test({
      code: `
        import * as foo from './foo';`,
    }),

    test({
      code: `export type UserId = number;`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // issue #653
    test({
      code: 'export default from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'export { a, b } from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    // ...SYNTAX_CASES,
    test({
      code: `
        export const [CounterProvider,, withCounter] = func();;
      `,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'let foo; export { foo as "default" };',
      languageOptions: { parserOptions: { ecmaVersion: 2022 } },
    }),
  ],
  invalid: [
    test({
      code: `
        export function bar() {};`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'single',
        },
      ],
    }),
    test({
      code: `
        export const foo = 'foo';`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'single',
        },
      ],
    }),
    test({
      code: `
        const foo = 'foo';
        export { foo };`,
      errors: [
        {
          type: 'ExportSpecifier',
          messageId: 'single',
        },
      ],
    }),
    test({
      code: `
        export const { foo } = { foo: "bar" };`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'single',
        },
      ],
    }),
    test({
      code: `
        export const { foo: { bar } } = { foo: { bar: "baz" } };`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'single',
        },
      ],
    }),
    test({
      code: `
        export const [a] = ["foo"]`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'single',
        },
      ],
    }),
  ],
})

// test cases for { target: 'any' }
ruleTester.run('prefer-default-export', rule, {
  // Any exporting file must contain default export
  valid: [
    test({
      code: `
          export default function bar() {};`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: `
              export const foo = 'foo';
              export const bar = 'bar';
              export default 42;`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: `
            export default a = 2;`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: `
            export const a = 2;
            export default function foo() {};`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: `
          export const a = 5;
          export function bar(){};
          let foo;
          export { foo as default }`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: `
          export * from './foo';`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: `export Memory, { MemoryValue } from './Memory'`,
      languageOptions: { parser: require(parsers.BABEL) },
      options: [
        {
          target: 'any',
        },
      ],
    }),
    // no exports at all
    test({
      code: `
            import * as foo from './foo';`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: `const a = 5;`,
      options: [
        {
          target: 'any',
        },
      ],
    }),
    test({
      code: 'export const a = 4; let foo; export { foo as "default" };',
      options: [{ target: 'any' }],
      languageOptions: { parserOptions: { ecmaVersion: 2022 } },
    }),
  ],
  // { target: 'any' } invalid cases when any exporting file must contain default export but does not
  invalid: [
    test({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';`,
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
    test({
      code: `
        export const foo = 'foo';
        export function bar() {};`,
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
    test({
      code: `
        let foo, bar;
        export { foo, bar }`,
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
    test({
      code: `
        let item;
        export const foo = item;
        export { item };`,
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
    test({
      code: 'export { a, b } from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
    test({
      code: `
        const foo = 'foo';
        export { foo };`,
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
    test({
      code: `
        export const { foo } = { foo: "bar" };`,
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
    test({
      code: `
        export const { foo: { bar } } = { foo: { bar: "baz" } };`,
      options: [
        {
          target: 'any',
        },
      ],
      errors: [
        {
          messageId: 'any',
        },
      ],
    }),
  ],
})

describe('TypeScript', () => {
  for (const parser of getNonDefaultParsers()) {
    const parserConfig = {
      parser,
      settings: {
        'import-x/parsers': { [parser]: ['.ts'] },
        'import-x/resolver': { 'eslint-import-resolver-typescript': true },
      },
    }

    ruleTester.run('prefer-default-export', rule, {
      valid: [
        // Exporting types
        test({
          code: `
            export type foo = string;
            export type bar = number;
            /* ${parser.replace(process.cwd(), '$$PWD')} */
          `,
          ...parserConfig,
        }),
        test({
          code: `
            export type foo = string;
            export type bar = number;
            /* ${parser.replace(process.cwd(), '$$PWD')} */
          `,
          ...parserConfig,
        }),
        test({
          code: `export type foo = string /* ${parser.replace(process.cwd(), '$$PWD')}*/`,
          ...parserConfig,
        }),
        test({
          code: `export interface foo { bar: string; } /* ${parser.replace(process.cwd(), '$$PWD')}*/`,
          ...parserConfig,
        }),
        test({
          code: `export interface foo { bar: string; }; export function goo() {} /* ${parser.replace(process.cwd(), '$$PWD')}*/`,
          ...parserConfig,
        }),
      ],
      invalid: [],
    })
  }
})
