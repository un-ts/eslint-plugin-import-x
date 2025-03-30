import { cjsRequire as require } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { AST_NODE_TYPES, TSESLint } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  getNonDefaultParsers,
  parsers,
} from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/prefer-default-export'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createSingleError(
  type: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'single', type: type as AST_NODE_TYPES }
}

// test cases for default option { target: 'single' }
ruleTester.run('prefer-default-export', rule, {
  valid: [
    tValid({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';`,
    }),
    tValid({
      code: `
        export default function bar() {};`,
    }),
    tValid({
      code: `
        export const foo = 'foo';
        export function bar() {};`,
    }),
    tValid({
      code: `
        export const foo = 'foo';
        export default bar;`,
    }),
    tValid({
      code: `
        let foo, bar;
        export { foo, bar }`,
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
      code: `export const [a, b] = item;`,
    }),
    tValid({
      code: `
        let item;
        export const foo = item;
        export { item };`,
    }),
    tValid({
      code: `
        let foo;
        export { foo as default }`,
    }),
    tValid({
      code: `
        export * from './foo';`,
    }),
    tValid({
      code: `export Memory, { MemoryValue } from './Memory'`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // no exports at all
    tValid({
      code: `import * as foo from './foo';`,
    }),

    tValid({
      code: `export type UserId = number;`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // issue #653
    tValid({
      code: 'export default from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export { a, b } from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    // ...SYNTAX_CASES,
    tValid({
      code: `
        export const [CounterProvider,, withCounter] = func();;
      `,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'let foo; export { foo as "default" };',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
  invalid: [
    tInvalid({
      code: `export function bar() {};`,
      errors: [createSingleError('ExportNamedDeclaration')],
    }),
    tInvalid({
      code: `export const foo = 'foo';`,
      errors: [createSingleError('ExportNamedDeclaration')],
    }),
    tInvalid({
      code: `
        const foo = 'foo';
        export { foo };`,
      errors: [createSingleError('ExportSpecifier')],
    }),
    tInvalid({
      code: `export const { foo } = { foo: "bar" };`,
      errors: [createSingleError('ExportNamedDeclaration')],
    }),
    tInvalid({
      code: `export const { foo: { bar } } = { foo: { bar: "baz" } };`,
      errors: [createSingleError('ExportNamedDeclaration')],
    }),
    tInvalid({
      code: `export const [a] = ["foo"]`,
      errors: [createSingleError('ExportNamedDeclaration')],
    }),
  ],
})

// test cases for { target: 'any' }
ruleTester.run('prefer-default-export', rule, {
  // Any exporting file must contain default export
  valid: [
    tValid({
      code: `export default function bar() {};`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: `
              export const foo = 'foo';
              export const bar = 'bar';
              export default 42;`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: `export default a = 2;`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: `
            export const a = 2;
            export default function foo() {};`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: `
          export const a = 5;
          export function bar(){};
          let foo;
          export { foo as default }`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: `export * from './foo';`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: `export Memory, { MemoryValue } from './Memory'`,
      languageOptions: { parser: require(parsers.BABEL) },
      options: [{ target: 'any' }],
    }),
    // no exports at all
    tValid({
      code: `import * as foo from './foo';`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: `const a = 5;`,
      options: [{ target: 'any' }],
    }),
    tValid({
      code: 'export const a = 4; let foo; export { foo as "default" };',
      options: [{ target: 'any' }],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
  // { target: 'any' } invalid cases when any exporting file must contain default export but does not
  invalid: [
    tInvalid({
      code: `
        export const foo = 'foo';
        export const bar = 'bar';`,
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
    tInvalid({
      code: `
        export const foo = 'foo';
        export function bar() {};`,
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
    tInvalid({
      code: `
        let foo, bar;
        export { foo, bar }`,
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
    tInvalid({
      code: `
        let item;
        export const foo = item;
        export { item };`,
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
    tInvalid({
      code: 'export { a, b } from "foo.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
    tInvalid({
      code: `
        const foo = 'foo';
        export { foo };`,
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
    tInvalid({
      code: `export const { foo } = { foo: "bar" };`,
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
    tInvalid({
      code: `export const { foo: { bar } } = { foo: { bar: "baz" } };`,
      options: [{ target: 'any' }],
      errors: [{ messageId: 'any' }],
    }),
  ],
})

describe('TypeScript', () => {
  for (const parser of getNonDefaultParsers()) {
    const parserConfig = {
      languageOptions: {
        ...(parser === parsers.BABEL && {
          parser: require<TSESLint.Parser.LooseParserModule>(parsers.BABEL),
        }),
      },
      settings: {
        'import-x/parsers': { [parsers.TS]: ['.ts'] },
        'import-x/resolver': { 'eslint-import-resolver-typescript': true },
      },
    }

    ruleTester.run('prefer-default-export', rule, {
      valid: [
        // Exporting types
        tValid({
          code: `
            export type foo = string;
            export type bar = number;
            /* ${parser.replace(process.cwd(), '$$PWD')} */
          `,
          ...parserConfig,
        }),
        tValid({
          code: `export type foo = string /* ${parser.replace(process.cwd(), '$$PWD')}*/`,
          ...parserConfig,
        }),
        tValid({
          code: `export interface foo { bar: string; } /* ${parser.replace(process.cwd(), '$$PWD')}*/`,
          ...parserConfig,
        }),
        tValid({
          code: `export interface foo { bar: string; }; export function goo() {} /* ${parser.replace(process.cwd(), '$$PWD')}*/`,
          ...parserConfig,
        }),
      ],
      invalid: [],
    })
  }
})
