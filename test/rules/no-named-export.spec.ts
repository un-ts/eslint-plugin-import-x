import { TSESLint } from '@typescript-eslint/utils'

import { parsers, test, testVersion } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-named-export'

const ruleTester = new TSESLint.RuleTester()

ruleTester.run('no-named-export', rule, {
  valid: [
    test({
      code: 'export default function bar() {};',
    }),
    test({
      code: 'let foo; export { foo as default }',
    }),
    test({
      code: 'export default from "foo.js"',
      parser: parsers.BABEL,
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

    // es2022: Arbitrary module namespae identifier names
    ...testVersion('>= 8.7', () => ({
      code: 'let foo; export { foo as "default" }',
      parserOptions: { ecmaVersion: 2022 },
    })),
  ],
  invalid: [
    test({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';
      `,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `
        export const foo = 'foo';
        export default bar;`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `
        export const foo = 'foo';
        export function bar() {};
      `,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export const foo = 'foo';`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `
        const foo = 'foo';
        export { foo };
      `,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `let foo, bar; export { foo, bar }`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export const { foo, bar } = item;`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export const { foo, bar: baz } = item;`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export const { foo: { bar, baz } } = item;`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `
        let item;
        export const foo = item;
        export { item };
      `,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export * from './foo';`,
      errors: [
        {
          type: 'ExportAllDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export const { foo } = { foo: "bar" };`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export const { foo: { bar } } = { foo: { bar: "baz" } };`,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: 'export { a, b } from "foo.js"',
      parser: parsers.BABEL,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export type UserId = number;`,
      parser: parsers.BABEL,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: 'export foo from "foo.js"',
      parser: parsers.BABEL,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
    test({
      code: `export Memory, { MemoryValue } from './Memory'`,
      parser: parsers.BABEL,
      errors: [
        {
          type: 'ExportNamedDeclaration',
          messageId: 'noAllowed',
        },
      ],
    }),
  ],
})
