import { cjsRequire as require } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { AST_NODE_TYPES } from '@typescript-eslint/utils'

import { parsers, createRuleTestCaseFunctions } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-default-export'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createNoAliasDefaultError(
  local: string,
  type?: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'noAliasDefault',
    data: { local },
    type: type as AST_NODE_TYPES,
  }
}

ruleTester.run('no-default-export', rule, {
  valid: [
    tValid({
      code: 'module.exports = function foo() {}',
      languageOptions: {
        parserOptions: {
          sourceType: 'script',
        },
      },
    }),
    tValid({
      code: 'module.exports = function foo() {}',
    }),
    tValid({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';
      `,
    }),
    tValid({
      code: `
        export const foo = 'foo';
        export function bar() {};
      `,
    }),
    tValid({
      code: `export const foo = 'foo';`,
    }),
    tValid({
      code: `
        const foo = 'foo';
        export { foo };
      `,
    }),
    tValid({
      code: `let foo, bar; export { foo, bar }`,
    }),
    tValid({
      code: `export const { foo, bar } = item;`,
    }),
    tValid({
      code: `export const { foo, bar: baz } = item;`,
    }),
    tValid({
      code: `export const { foo: { bar, baz } } = item;`,
    }),
    tValid({
      code: `
        let item;
        export const foo = item;
        export { item };
      `,
    }),
    tValid({
      code: `export * from './foo';`,
    }),
    tValid({
      code: `export const { foo } = { foo: "bar" };`,
    }),
    tValid({
      code: `export const { foo: { bar } } = { foo: { bar: "baz" } };`,
    }),
    tValid({
      code: 'export { a, b } from "foo.js"',
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
      code: `export type UserId = number;`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export foo from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `export Memory, { MemoryValue } from './Memory'`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
  ],
  invalid: [
    tInvalid({
      code: 'export default function bar() {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration' as AST_NODE_TYPES,
          messageId: 'preferNamed',
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: `
        export const foo = 'foo';
        export default bar;`,
      errors: [
        {
          type: 'ExportDefaultDeclaration' as AST_NODE_TYPES,
          messageId: 'preferNamed',
          line: 3,
          column: 16,
        },
      ],
    }),
    tInvalid({
      code: 'export default class Bar {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration' as AST_NODE_TYPES,
          messageId: 'preferNamed',
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'export default function() {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration' as AST_NODE_TYPES,
          messageId: 'preferNamed',
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'export default class {};',
      errors: [
        {
          type: 'ExportDefaultDeclaration' as AST_NODE_TYPES,
          messageId: 'preferNamed',
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'let foo; export { foo as default }',
      errors: [createNoAliasDefaultError('foo', 'ExportNamedDeclaration')],
    }),
    tInvalid({
      code: "function foo() { return 'foo'; }\nexport default foo;",
      filename: 'foo.ts',
      errors: [
        {
          type: 'ExportDefaultDeclaration' as AST_NODE_TYPES,
          messageId: 'preferNamed',
        },
      ],
      languageOptions: {
        parserOptions: {
          ecmaversion: 'latest',
          sourceType: 'module',
        },
      },
      settings: {
        'import-x/resolver': { typescript: true },
      },
    }),
    tInvalid({
      code: 'export default from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          type: 'ExportNamedDeclaration' as AST_NODE_TYPES,
          messageId: 'preferNamed',
        },
      ],
    }),
    tInvalid({
      code: 'let foo; export { foo as "default" }',
      errors: [createNoAliasDefaultError('foo', 'ExportNamedDeclaration')],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
})
