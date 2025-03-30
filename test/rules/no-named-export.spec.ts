import { cjsRequire as require } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

import { parsers, createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-named-export'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const NO_ALLOWED_ERROR = {
  messageId: 'noAllowed',
  type: AST_NODE_TYPES.ExportNamedDeclaration,
} as const

ruleTester.run('no-named-export', rule, {
  valid: [
    tValid({
      code: 'module.export.foo = function () {}',
    }),
    tValid({
      code: 'module.exports = function foo() {}',
      languageOptions: {
        parserOptions: {
          sourceType: 'script',
        },
      },
    }),
    tValid({
      code: 'export default function bar() {};',
    }),
    tValid({
      code: 'let foo; export { foo as default }',
    }),
    tValid({
      code: 'export default from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // no exports at all
    tValid({
      code: `import * as foo from './foo';`,
    }),
    tValid({
      code: `import foo from './foo';`,
    }),
    tValid({
      code: `import {default as foo} from './foo';`,
    }),
    tValid({
      code: 'let foo; export { foo as "default" }',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
  invalid: [
    tInvalid({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';
      `,
      errors: [NO_ALLOWED_ERROR, NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        export const foo = 'foo';
        export default bar;`,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        export const foo = 'foo';
        export function bar() {};
      `,
      errors: [NO_ALLOWED_ERROR, NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export const foo = 'foo';`,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        const foo = 'foo';
        export { foo };
      `,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `let foo, bar; export { foo, bar }`,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export const { foo, bar } = item;`,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export const { foo, bar: baz } = item;`,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export const { foo: { bar, baz } } = item;`,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        let item;
        export const foo = item;
        export { item };
      `,
      errors: [NO_ALLOWED_ERROR, NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export * from './foo';`,
      errors: [
        {
          messageId: 'noAllowed',
          type: AST_NODE_TYPES.ExportAllDeclaration,
        },
      ],
    }),
    tInvalid({
      code: `export const { foo } = { foo: "bar" };`,
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export const { foo: { bar } } = { foo: { bar: "baz" } };`,
      errors: [
        { messageId: 'noAllowed', type: AST_NODE_TYPES.ExportNamedDeclaration },
      ],
    }),
    tInvalid({
      code: 'export { a, b } from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export type UserId = number;`,
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: 'export foo from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [NO_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `export Memory, { MemoryValue } from './Memory'`,
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [NO_ALLOWED_ERROR],
    }),
  ],
})
