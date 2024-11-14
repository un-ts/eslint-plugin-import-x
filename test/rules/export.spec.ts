import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { test, testFilePath, SYNTAX_VALID_CASES, parsers } from '../utils'

import rule from 'eslint-plugin-import-x/rules/export'

const ruleTester = new TSESLintRuleTester()

ruleTester.run('export', rule, {
  valid: [
    test({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),

    // default
    test({ code: 'var foo = "foo"; export default foo;' }),
    test({ code: 'export var foo = "foo"; export var bar = "bar";' }),
    test({ code: 'export var foo = "foo", bar = "bar";' }),
    test({ code: 'export var { foo, bar } = object;' }),
    test({ code: 'export var [ foo, bar ] = array;' }),
    test({ code: 'let foo; export { foo, foo as bar }' }),
    test({ code: 'let bar; export { bar }; export * from "./export-all"' }),
    test({ code: 'export * from "./export-all"' }),
    test({ code: 'export * from "./does-not-exist"' }),

    // #328: "export * from" does not export a default
    test({ code: 'export default foo; export * from "./bar"' }),

    ...SYNTAX_VALID_CASES,

    test({
      code: `
        import * as A from './named-export-collision/a';
        import * as B from './named-export-collision/b';

        export { A, B };
      `,
    }),
    test({
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
    // test({
    //   code: 'export default foo; export default bar',
    //   errors: ['Multiple default exports.', 'Multiple default exports.'],
    // }),
    // test({
    //   code: 'export default function foo() {}; ' +
    //              'export default function bar() {}',
    //   errors: ['Multiple default exports.', 'Multiple default exports.'],
    // }),

    // test({
    //   code: 'export function foo() {}; ' +
    //              'export { bar as foo }',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // test({
    //   code: 'export {foo}; export {foo};',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // test({
    //   code: 'export {foo}; export {bar as foo};',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // test({
    //   code: 'export var foo = "foo"; export var foo = "bar";',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // test({
    //   code: 'export var foo = "foo", foo = "bar";',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    test({
      code: 'let foo; export { foo }; export * from "./export-all"',
      errors: [
        "Multiple exports of name 'foo'.",
        "Multiple exports of name 'foo'.",
      ],
    }),
    // test({
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
    test({
      code: 'export * from "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
      errors: [
        {
          message:
            "Parse errors in imported module './malformed.js': 'return' outside of function (1:1)",
          type: 'Literal',
        },
      ],
    }),

    // test({
    //   code: 'export var { foo, bar } = object; export var foo = "bar"',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // test({
    //   code: 'export var { bar: { foo } } = object; export var foo = "bar"',
    //   errors: ['Parsing error: Duplicate export \'foo\''],
    // }),
    // test({
    //   code: 'export var [ foo, bar ] = array; export var bar = "baz"',
    //   errors: ['Parsing error: Duplicate export \'bar\''],
    // }),
    // test({
    //   code: 'export var [ foo, /*sparse*/, { bar } ] = array; export var bar = "baz"',
    //   errors: ['Parsing error: Duplicate export \'bar\''],
    // }),

    // #328: "export * from" does not export a default
    test({
      code: 'export * from "./default-export"',
      errors: [`No named exports found in module './default-export'.`],
    }),

    test({
      code: 'let foo; export { foo as "foo" }; export * from "./export-all"',
      errors: [
        "Multiple exports of name 'foo'.",
        "Multiple exports of name 'foo'.",
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: {
          ecmaVersion: 2022,
        },
      },
    }),

    test({
      code: `
        export default function a(): void;
        export default function a() {}
        export { x as default };
      `,
      errors: ['Multiple default exports.', 'Multiple default exports.'],
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
      test({
        code: `
          export const Foo = 1;
          export type Foo = number;
        `,
        ...parserConfig,
      }),
      test({
        code: `
          export const Foo = 1;
          export interface Foo {}
        `,
        ...parserConfig,
      }),

      test({
        code: `
          export function fff(a: string);
          export function fff(a: number);
        `,
        ...parserConfig,
      }),

      test({
        code: `
          export function fff(a: string);
          export function fff(a: number);
          export function fff(a: string|number) {};
        `,
        ...parserConfig,
      }),

      // namespace
      test({
        code: `
          export const Bar = 1;
          export namespace Foo {
            export const Bar = 1;
          }
        `,
        ...parserConfig,
      }),
      test({
        code: `
          export type Bar = string;
          export namespace Foo {
            export type Bar = string;
          }
        `,
        ...parserConfig,
      }),
      test({
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
      test({
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

      test({
        code: `
            export class Foo { }
            export namespace Foo { }
            export namespace Foo {
              export class Bar {}
            }
          `,
        ...parserConfig,
      }),
      test({
        code: `
            export function Foo();
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      test({
        code: `
            export function Foo(a: string);
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      test({
        code: `
            export function Foo(a: string);
            export function Foo(a: number);
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      test({
        code: `
            export enum Foo { }
            export namespace Foo { }
          `,
        ...parserConfig,
      }),
      test({
        code: 'export * from "./file1.ts"',
        filename: testFilePath('typescript-d-ts/file-2.ts'),
        ...parserConfig,
      }),

      test({
        code: `
            export * as A from './named-export-collision/a';
            export * as B from './named-export-collision/b';
          `,
      }),

      // Exports in ambient modules
      test({
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
      test({
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

      test({
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
      test({
        code: `
          export type Foo = string;
          export type Foo = number;
        `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),

      // namespace
      test({
        code: `
          export const a = 1
          export namespace Foo {
            export const a = 2;
            export const a = 3;
          }
        `,
        errors: [
          {
            message: `Multiple exports of name 'a'.`,
            line: 4,
          },
          {
            message: `Multiple exports of name 'a'.`,
            line: 5,
          },
        ],
        ...parserConfig,
      }),
      test({
        code: `
          declare module 'foo' {
            const Foo = 1;
            export default Foo;
            export default Foo;
          }
        `,
        errors: [
          {
            message: 'Multiple default exports.',
            line: 4,
          },
          {
            message: 'Multiple default exports.',
            line: 5,
          },
        ],
        ...parserConfig,
      }),
      test({
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
            message: `Multiple exports of name 'Foo'.`,
            line: 4,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 5,
          },
          {
            message: `Multiple exports of name 'Bar'.`,
            line: 8,
          },
          {
            message: `Multiple exports of name 'Bar'.`,
            line: 9,
          },
        ],
        ...parserConfig,
      }),

      test({
        code: `
            export class Foo { }
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      test({
        code: `
            export enum Foo { }
            export enum Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      test({
        code: `
            export enum Foo { }
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      test({
        code: `
            export const Foo = 'bar';
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      test({
        code: `
            export function Foo() { };
            export class Foo { }
            export namespace Foo { }
          `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      test({
        code: `
            export const Foo = 'bar';
            export function Foo() { };
            export namespace Foo { }
          `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),
      test({
        code: `
            export const Foo = 'bar';
            export namespace Foo { }
          `,
        errors: [
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 2,
          },
          {
            message: `Multiple exports of name 'Foo'.`,
            line: 3,
          },
        ],
        ...parserConfig,
      }),

      // Exports in ambient modules
      test({
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
            message: 'Multiple default exports.',
            line: 7,
          },
          {
            message: 'Multiple default exports.',
            line: 9,
          },
        ],
        ...parserConfig,
      }),
    ],
  })
})
