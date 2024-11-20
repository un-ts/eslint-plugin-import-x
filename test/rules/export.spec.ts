import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import {
  testFilePath,
  SYNTAX_VALID_CASES,
  parsers,
  createRuleTestCaseFunctions,
} from '../utils'
import type { RuleRunTests } from '../utils'

import rule from 'eslint-plugin-import-x/rules/export'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('export', rule, {
  valid: [
    tValid({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),

    // default
    tValid({ code: 'var foo = "foo"; export default foo;' }),
    tValid({ code: 'export var foo = "foo"; export var bar = "bar";' }),
    tValid({ code: 'export var foo = "foo", bar = "bar";' }),
    tValid({ code: 'export var { foo, bar } = object;' }),
    tValid({ code: 'export var [ foo, bar ] = array;' }),
    tValid({ code: 'let foo; export { foo, foo as bar }' }),
    tValid({ code: 'let bar; export { bar }; export * from "./export-all"' }),
    tValid({ code: 'export * from "./export-all"' }),
    tValid({ code: 'export * from "./does-not-exist"' }),

    // #328: "export * from" does not export a default
    tValid({ code: 'export default foo; export * from "./bar"' }),

    ...(SYNTAX_VALID_CASES as RuleRunTests<typeof rule>['valid']),

    tValid({
      code: `
        import * as A from './named-export-collision/a';
        import * as B from './named-export-collision/b';

        export { A, B };
      `,
    }),
    tValid({
      code: `
        export * as A from './named-export-collision/a';
        export * as B from './named-export-collision/b';
      `,
      languageOptions: {
        parserOptions: {
          ecmaVersion: 2020,
        },
      },
    }),

    {
      code: `
        export default function foo(param: string): boolean;
        export default function foo(param: string, param1: number): boolean;
        export default function foo(param: string, param1?: number): boolean {
          return param && param1;
        }
      `,
    },
    {
      code: `
      export default function foo(param: string): boolean;
      export default function foo(param: string, param1?: number): boolean {
        return param && param1;
      }
    `,
    },
  ],

  invalid: [
    // multiple defaults
    // tInvalid({
    //   code: 'export default foo; export default bar',
    //   errors: ['Multiple default exports.', 'Multiple default exports.'],
    // }),
    // tInvalid({
    //   code: 'export default function foo() {}; ' +
    //              'export default function bar() {}',
    //   errors: ['Multiple default exports.', 'Multiple default exports.'],
    // }),

    // tInvalid({
    //   code: 'export function foo() {}; ' +
    //              'export { bar as foo }',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // tInvalid({
    //   code: 'export {foo}; export {foo};',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // tInvalid({
    //   code: 'export {foo}; export {bar as foo};',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // tInvalid({
    //   code: 'export var foo = "foo"; export var foo = "bar";',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // tInvalid({
    //   code: 'export var foo = "foo", foo = "bar";',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    tInvalid({
      code: 'let foo; export { foo }; export * from "./export-all"',
      errors: [
        { messageId: 'multiNamed', data: { name: 'foo' } },
        { messageId: 'multiNamed', data: { name: 'foo' } },
      ],
    }),
    // tInvalid({
    //   code: 'export * from "./default-export"',
    //   errors: [
    //     {
    //       message: 'No named exports found in module \'./default-export\'.',
    //       type: 'Literal',
    //     },
    //   ],
    // }),

    // note: Espree bump to Acorn 4+ changed this test's error message.
    //       `npm up` first if it's failing.
    tInvalid({
      code: 'export * from "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
      errors: [
        {
          // @ts-expect-error parse error here so can'use rule types
          message:
            "Parse errors in imported module './malformed.js': 'return' outside of function (1:1)",
        },
      ],
    }),

    // tInvalid({
    //   code: 'export var { foo, bar } = object; export var foo = "bar"',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // tInvalid({
    //   code: 'export var { bar: { foo } } = object; export var foo = "bar"',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // tInvalid({
    //   code: 'export var [ foo, bar ] = array; export var bar = "baz"',
    //   errors: ['Parsing error: Duplicate export \'bar\''],
    // }),
    // tInvalid({
    //   code: 'export var [ foo, /*sparse*/, { bar } ] = array; export var bar = "baz"',
    //   errors: ['Parsing error: Duplicate export \'bar\''],
    // }),

    // #328: "export * from" does not export a default
    tInvalid({
      code: 'export * from "./default-export"',
      errors: [{ messageId: 'noNamed', data: { module: './default-export' } }],
    }),

    tInvalid({
      code: 'let foo; export { foo as "foo" }; export * from "./export-all"',
      errors: [
        { messageId: 'multiNamed', data: { name: 'foo' } },
        { messageId: 'multiNamed', data: { name: 'foo' } },
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: {
          ecmaVersion: 2022,
        },
      },
    }),

    tInvalid({
      code: `
        export default function a(): void;
        export default function a() {}
        export { x as default };
      `,
      errors: [{ messageId: 'multiDefault' }, { messageId: 'multiDefault' }],
    }),
  ],
})

describe('TypeScript', () => {
  const parserConfig = {
    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }

  ruleTester.run('export', rule, {
    valid: [
      // type/value name clash
      tValid({
        code: `
          export const Foo = 1;
          export type Foo = number;
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export const Foo = 1;
          export interface Foo {}
        `,
        ...parserConfig,
      }),

      tValid({
        code: `
          export function fff(a: string);
          export function fff(a: number);
        `,
        ...parserConfig,
      }),

      tValid({
        code: `
          export function fff(a: string);
          export function fff(a: number);
          export function fff(a: string|number) {};
        `,
        ...parserConfig,
      }),

      // namespace
      tValid({
        code: `
          export const Bar = 1;
          export namespace Foo {
            export const Bar = 1;
          }
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export type Bar = string;
          export namespace Foo {
            export type Bar = string;
          }
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export const Bar = 1;
          export type Bar = string;
          export namespace Foo {
            export const Bar = 1;
            export type Bar = string;
          }
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export namespace Foo {
            export const Foo = 1;
            export namespace Bar {
              export const Foo = 2;
            }
            export namespace Baz {
              export const Foo = 3;
            }
          }
        `,
        ...parserConfig,
      }),

      tValid({
        code: `
            export class Foo { }
            export namespace Foo { }
            export namespace Foo {
              export class Bar {}
            }
          `,
        ...parserConfig,
      }),
      tValid({
        code: `
            export function Foo();
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      tValid({
        code: `
            export function Foo(a: string);
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      tValid({
        code: `
            export function Foo(a: string);
            export function Foo(a: number);
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      tValid({
        code: `
            export enum Foo { }
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      tValid({
        code: 'export * from "./file1.ts"',
        filename: testFilePath('typescript-d-ts/file-2.ts'),
        ...parserConfig,
      }),

      tValid({
        code: `
            export * as A from './named-export-collision/a';
            export * as B from './named-export-collision/b';
          `,
      }),

      // Exports in ambient modules
      tValid({
        code: `
          declare module "a" {
            const Foo = 1;
            export {Foo as default};
          }
          declare module "b" {
            const Bar = 2;
            export {Bar as default};
          }
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          declare module "a" {
            const Foo = 1;
            export {Foo as default};
          }
          const Bar = 2;
          export {Bar as default};
        `,
        ...parserConfig,
      }),

      tValid({
        ...parserConfig,
        code: `
          export * from './module';
        `,
        filename: testFilePath('export-star-4/index.js'),
        settings: {
          ...parserConfig.settings,
          'import-x/extensions': ['.js', '.ts', '.jsx'],
        },
      }),
    ],
    invalid: [
      // type/value name clash
      tInvalid({
        code: `
          export type Foo = string;
          export type Foo = number;
        `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),

      // namespace
      tInvalid({
        code: `
          export const a = 1
          export namespace Foo {
            export const a = 2;
            export const a = 3;
          }
        `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'a' },
            line: 4,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'a' },
            line: 5,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          declare module 'foo' {
            const Foo = 1;
            export default Foo;
            export default Foo;
          }
        `,
        errors: [
          {
            messageId: 'multiDefault',
            line: 4,
          },
          {
            messageId: 'multiDefault',
            line: 5,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          export namespace Foo {
            export namespace Bar {
              export const Foo = 1;
              export const Foo = 2;
            }
            export namespace Baz {
              export const Bar = 3;
              export const Bar = 4;
            }
          }
        `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 4,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 5,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Bar' },
            line: 8,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Bar' },
            line: 9,
          },
        ],
        ...parserConfig,
      }),

      tInvalid({
        code: `
            export class Foo { }
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
            export enum Foo { }
            export enum Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
            export enum Foo { }
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
            export const Foo = 'bar';
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
            export function Foo() { };
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
            export const Foo = 'bar';
            export function Foo() { };
            export namespace Foo { }
          `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
            export const Foo = 'bar';
            export namespace Foo { }
          `,
        errors: [
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 2,
          },
          {
            messageId: 'multiNamed',
            data: { name: 'Foo' },
            line: 3,
          },
        ],
        ...parserConfig,
      }),

      // Exports in ambient modules
      tInvalid({
        code: `
          declare module "a" {
            const Foo = 1;
            export {Foo as default};
          }
          const Bar = 2;
          export {Bar as default};
          const Baz = 3;
          export {Baz as default};
        `,
        errors: [
          {
            messageId: 'multiDefault',
            line: 7,
          },
          {
            messageId: 'multiDefault',
            line: 9,
          },
        ],
        ...parserConfig,
      }),
    ],
  })
})
