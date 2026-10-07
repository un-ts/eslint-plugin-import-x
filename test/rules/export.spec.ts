import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import {
  testFilePath,
  SYNTAX_VALID_CASES,
  parsers,
  createRuleTestCaseFunctions,
} from '../utils.js'
import type { RuleRunTests } from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/export'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const literalExportNames = [
  'type:Foo',
  'value:Foo',
  'type:type:Foo',
  'value:value:Foo',
  'type:value:Foo',
  'value:type:Foo',
  'Foo:type:Bar',
  'Foo:value:Bar',
  'type:default',
  'value:default',
]

ruleTester.run('export', rule, {
  valid: [
    tValid({
      code: 'import "./malformed.js"',
      languageOptions: { parser: cjsRequire(parsers.ESPREE) },
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
      languageOptions: { parser: cjsRequire(parsers.ESPREE) },
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
        parser: cjsRequire(parsers.ESPREE),
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

for (const { name, parser } of [
  { name: 'Espree', parser: parsers.ESPREE },
  { name: 'TypeScript', parser: parsers.TS },
]) {
  const { tValid: literalValid, tInvalid: literalInvalid } =
    createRuleTestCaseFunctions<typeof rule>({
      languageOptions: {
        ...(parser === parsers.TS ? {} : { parser: cjsRequire(parser) }),
        parserOptions: { ecmaVersion: 2022 },
      },
    })

  ruleTester.run(`export (literal names, ${name})`, rule, {
    valid: [
      ...literalExportNames.flatMap(name => [
        literalValid({
          name: `preserves literal ${name} before Foo`,
          code: `const local = 1; const Foo = 2; export { local as "${name}", Foo };`,
        }),
        literalValid({
          name: `preserves literal ${name} after Foo`,
          code: `const local = 1; const Foo = 2; export { Foo, local as "${name}" };`,
        }),
      ]),
      literalValid({
        code: `
          export { Foo as "type:Foo" } from "./export-name-prefixes";
          export { Foo } from "./export-name-prefixes";
        `,
      }),
      literalValid({
        code: `
          const local = 1;
          export { local as "type:default", local as "value:default" };
          export default 2;
        `,
      }),
      literalValid({
        code: 'export * from "./export-name-prefixes"',
      }),
    ],
    invalid: [
      ...literalExportNames.map(name =>
        literalInvalid({
          code: `
            export { Foo as "${name}" } from "./export-name-prefixes";
            export * from "./export-name-prefixes";
          `,
          errors: [
            { messageId: 'multiNamed', data: { name }, line: 2 },
            { messageId: 'multiNamed', data: { name }, line: 3 },
          ],
        }),
      ),
      literalInvalid({
        code: `
          export { Foo, Foo as "type:Foo" } from "./export-name-prefixes";
          export * from "./export-name-prefixes";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'type:Foo' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'type:Foo' }, line: 3 },
        ],
      }),
    ],
  })
}

describe('TypeScript', () => {
  const parserConfig = {
    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }

  ruleTester.run('export (literal type names)', rule, {
    valid: [
      tValid({
        code: `
          const local = 1;
          export type Foo = number;
          export { local as "type:Foo" };
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          const local = 1;
          export { local as "type:Foo" };
          export type Foo = number;
        `,
        ...parserConfig,
      }),
      ...['export type { Foo }', 'export { type Foo }'].map(declaration =>
        tValid({
          code: `
            type Foo = number;
            const local = 1;
            ${declaration};
            export { local as "type:Foo" };
          `,
          ...parserConfig,
        }),
      ),
      tValid({
        code: `
          export type * from "./export-name-prefixes";
          export { Foo, Foo as "type:Foo" } from "./export-name-prefixes";
        `,
        ...parserConfig,
      }),
    ],
    invalid: [
      ...literalExportNames.flatMap(name =>
        [
          `export type { Foo as "${name}" }`,
          `export { type Foo as "${name}" }`,
        ].map(declaration =>
          tInvalid({
            code: `
              type Foo = number;
              const local = 1;
              ${declaration};
              export { local as "${name}" };
            `,
            errors: [
              { messageId: 'multiNamed', data: { name }, line: 4 },
              { messageId: 'multiNamed', data: { name }, line: 5 },
            ],
            ...parserConfig,
          }),
        ),
      ),
      tInvalid({
        code: `
          type Foo = number;
          const local = 1;
          export type { Foo as "default" };
          export { local as default };
        `,
        errors: [
          { messageId: 'multiDefault', line: 4 },
          { messageId: 'multiDefault', line: 5 },
        ],
        ...parserConfig,
      }),
    ],
  })

  ruleTester.run('export (ambient overloads)', rule, {
    valid: [
      tValid({
        filename: testFilePath('overloads.d.ts'),
        code: `
          type T = number;
          export type { T as default };
          export default function foo(a: string): string;
          export default function foo(a: number): number;
        `,
      }),
      tValid({
        filename: testFilePath('overloads.d.ts'),
        code: `
          export { type MyType as Foo } from "./export-type-star/types";
          export declare function Foo(a: string): string;
          export declare function Foo(a: number): number;
        `,
        ...parserConfig,
      }),
    ],
    invalid: [
      tInvalid({
        filename: testFilePath('overloads.d.ts'),
        code: `
          declare const value: number;
          export { value as default };
          export default function foo(a: string): string;
          export default function foo(a: number): number;
        `,
        errors: [
          { messageId: 'multiDefault', line: 3 },
          { messageId: 'multiDefault', line: 4 },
        ],
      }),
      tInvalid({
        filename: testFilePath('overloads.d.ts'),
        code: `
          declare const value: number;
          export { value as Foo };
          export declare function Foo(a: string): string;
          export declare function Foo(a: number): number;
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 4 },
        ],
      }),
    ],
  })

  ruleTester.run('export (resolved namespaces)', rule, {
    valid: [
      ...['foo', 'barrel', 'ordinary-star', 'type-star', 'cycle-a'].map(
        source =>
          tValid({
            code: `
              export type * from "./export-type-star/${source}";
              export type foo = number;
            `,
            ...parserConfig,
          }),
      ),
      tValid({
        code: `
          export type * from "./export-type-star/aliases";
          export type RenamedValue = number;
          export type ImportedValue = number;
          export type TypeValue = number;
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export * from "./export-type-star/type-star";
          export { foo, C, E } from "./export-type-star/mixed";
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export * from "./export-type-star/types";
          export const MyType = 1;
        `,
        ...parserConfig,
      }),
    ],
    invalid: [
      ...[
        { name: 'C', declaration: 'export type { C }' },
        { name: 'E', declaration: 'export { type E }' },
      ].map(({ name, declaration }) =>
        tInvalid({
          code: `
            export * from "./export-type-star/mixed";
            ${declaration} from "./export-type-star/mixed";
          `,
          errors: [
            { messageId: 'multiNamed', data: { name }, line: 2 },
            { messageId: 'multiNamed', data: { name }, line: 3 },
          ],
          ...parserConfig,
        }),
      ),
      tInvalid({
        code: `
          export * from "./export-type-star/mixed";
          export type { C } from "./export-type-star/mixed";
          export { C } from "./export-type-star/mixed";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'C' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'C' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'C' }, line: 4 },
        ],
        ...parserConfig,
      }),
      ...['T', 'I', 'C', 'E', 'N'].map(name =>
        tInvalid({
          code: `
            export type * from "./export-type-star/mixed";
            export type { ${name} } from "./export-type-star/mixed";
          `,
          errors: [
            { messageId: 'multiNamed', data: { name }, line: 2 },
            { messageId: 'multiNamed', data: { name }, line: 3 },
          ],
          ...parserConfig,
        }),
      ),
      ...['ImportedType', 'RenamedDefault', 'LocalType', 'TypeClass'].map(
        name =>
          tInvalid({
            code: `
              export type * from "./export-type-star/aliases";
              export type { ${name} } from "./export-type-star/aliases";
            `,
            errors: [
              { messageId: 'multiNamed', data: { name }, line: 2 },
              { messageId: 'multiNamed', data: { name }, line: 3 },
            ],
            ...parserConfig,
          }),
      ),
      tInvalid({
        code: `
          export * from "./export-type-star/type-star";
          export type { RenamedClass } from "./export-type-star/aliases";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'RenamedClass' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'RenamedClass' }, line: 3 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          export type * from "./export-type-star/cycle-a";
          export type CycleType = number;
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'CycleType' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'CycleType' }, line: 3 },
        ],
        ...parserConfig,
      }),
    ],
  })

  ruleTester.run('export (type-only)', rule, {
    valid: [
      tValid({
        code: `
          export type * from "./foo.ts";
          export { foo } from "./foo.ts";
        `,
        filename: testFilePath('export-type-star/bar.ts'),
        ...parserConfig,
      }),
      tValid({
        code: `
          export { foo } from "./foo.ts";
          export type * from "./foo.ts";
        `,
        filename: testFilePath('export-type-star/bar.ts'),
        ...parserConfig,
      }),
      tValid({
        code: `
          export type * from "./export-type-star/foo";
          export * from "./export-type-star/foo";
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export type * from "./export-type-star/barrel";
          export { foo } from "./export-type-star/foo";
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export type * from "./typescript";
          export { Bar, MyEnum, MyNamespace, getFoo } from "./typescript";
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export type * as Types from "./typescript";
          export * as Values from "./typescript";
        `,
        ...parserConfig,
      }),
      tValid({
        code: `
          export class Foo {}
          export interface Foo { value: number }
        `,
        ...parserConfig,
      }),
      ...[
        'export type { MyType as foo }',
        'export { type MyType as foo }',
        'export { type MyType as foo, getFoo }',
      ].map(declaration =>
        tValid({
          code: `
            ${declaration} from "./typescript";
            export * from "./export-type-star/foo";
          `,
          ...parserConfig,
        }),
      ),
      ...['export type { foo }', 'export { type foo }'].map(declaration =>
        tValid({
          code: `
            type foo = number;
            ${declaration};
            export * from "./export-type-star/foo";
          `,
          ...parserConfig,
        }),
      ),
      tValid({
        code: `
          declare module "a" {
            type Foo = number;
            export type { Foo };
          }
          declare module "b" {
            type Foo = string;
            export { type Foo };
          }
        `,
        ...parserConfig,
      }),
      tValid({
        code: 'export type * from "./does-not-exist"',
        ...parserConfig,
      }),
    ],
    invalid: [
      ...[
        'export type { MyType as Foo }',
        'export { type MyType as Foo }',
      ].flatMap(typeExport =>
        [
          'export const Foo = 1',
          'export class Foo {}',
          'export enum Foo { Value }',
          'export namespace Foo { export const value = 1 }',
          'export { getFoo as Foo } from "./typescript"',
        ].map(declaration =>
          tInvalid({
            code: `
                ${typeExport} from "./typescript";
                ${declaration};
              `,
            errors: [
              { messageId: 'multiNamed', data: { name: 'Foo' }, line: 2 },
              { messageId: 'multiNamed', data: { name: 'Foo' }, line: 3 },
            ],
            ...parserConfig,
          }),
        ),
      ),
      tInvalid({
        code: `
          export type { MyType as Foo } from "./typescript";
          export { type MyType as Foo } from "./typescript";
          export class Foo {}
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 4 },
        ],
        ...parserConfig,
      }),
      ...[
        'export type MyType = number',
        'export type { MyType } from "./typescript"',
        'export { type MyType } from "./typescript"',
        'export type * from "./export-type-star/types"',
      ].map(declaration =>
        tInvalid({
          code: `
            export type * from "./typescript";
            ${declaration};
          `,
          errors: [
            { messageId: 'multiNamed', data: { name: 'MyType' }, line: 2 },
            { messageId: 'multiNamed', data: { name: 'MyType' }, line: 3 },
          ],
          ...parserConfig,
        }),
      ),
      ...['export type { MyType as Foo }', 'export { type MyType as Foo }'].map(
        declaration =>
          tInvalid({
            code: `
            ${declaration} from "./typescript";
            export type Foo = number;
          `,
            errors: [
              { messageId: 'multiNamed', data: { name: 'Foo' }, line: 2 },
              { messageId: 'multiNamed', data: { name: 'Foo' }, line: 3 },
            ],
            ...parserConfig,
          }),
      ),
      tInvalid({
        code: `
          export type { MyType as Foo } from "./typescript";
          export { type MyType as Foo } from "./typescript";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 3 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          export type * from "./typescript";
          export type { Bar, MyEnum } from "./typescript";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'MyEnum' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'Bar' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'Bar' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'MyEnum' }, line: 3 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          export type * from "./typescript";
          export { Bar, MyEnum } from "./typescript";
          export { Bar, MyEnum } from "./typescript";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'Bar' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'MyEnum' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'Bar' }, line: 4 },
          { messageId: 'multiNamed', data: { name: 'MyEnum' }, line: 4 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          export { type MyType, getFoo } from "./typescript";
          export { getFoo } from "./typescript";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'getFoo' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'getFoo' }, line: 3 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          export * from "./export-type-star/foo";
          export { foo } from "./export-type-star/foo";
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'foo' }, line: 2 },
          { messageId: 'multiNamed', data: { name: 'foo' }, line: 3 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          declare module "a" {
            export type { MyType as Foo } from "./typescript";
            export type Foo = number;
          }
          export type Foo = string;
        `,
        errors: [
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 3 },
          { messageId: 'multiNamed', data: { name: 'Foo' }, line: 4 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: `
          export type { MyType as default } from "./typescript";
          export { type Foo as default } from "./typescript";
          export default 1;
        `,
        errors: [
          { messageId: 'multiDefault', line: 2 },
          { messageId: 'multiDefault', line: 3 },
          { messageId: 'multiDefault', line: 4 },
        ],
        ...parserConfig,
      }),
      tInvalid({
        code: 'export type * from "./default-export"',
        errors: [
          { messageId: 'noNamed', data: { module: './default-export' } },
        ],
        ...parserConfig,
      }),
    ],
  })

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
