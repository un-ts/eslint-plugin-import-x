import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { TSESTree } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunction,
  SYNTAX_VALID_CASES,
  testFilePath,
  parsers,
} from '../utils'
import type { RunTests, GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/named'
import { CASE_SENSITIVE_FS } from 'eslint-plugin-import-x/utils'

const ruleTester = new TSESLintRuleTester()

const test = createRuleTestCaseFunction<typeof rule>()

function createNotFoundError(
  name: string,
  module: string,
  type: `${TSESTree.AST_NODE_TYPES}` = 'Identifier',
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'notFound',
    data: { name, path: module },
    type: type as TSESTree.AST_NODE_TYPES,
  }
}

function createNotFoundDeepError(
  name: string,
  deepPath: string,
  type: `${TSESTree.AST_NODE_TYPES}` = 'Identifier',
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'notFoundDeep',
    data: { name, deepPath },
    type: type as TSESTree.AST_NODE_TYPES,
  }
}

ruleTester.run('named', rule, {
  valid: [
    test({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),

    test({ code: 'import { foo } from "./bar"' }),
    test({ code: 'import { foo } from "./empty-module"' }),
    test({ code: 'import bar from "./bar.js"' }),
    test({ code: 'import bar, { foo } from "./bar.js"' }),
    test({ code: 'import {a, b, d} from "./named-exports"' }),
    test({ code: 'import {ExportedClass} from "./named-exports"' }),
    test({ code: 'import { destructingAssign } from "./named-exports"' }),
    test({
      code: 'import { destructingRenamedAssign } from "./named-exports"',
    }),
    test({ code: 'import { ActionTypes } from "./qc"' }),
    test({ code: 'import {a, b, c, d} from "./re-export"' }),
    test({ code: 'import {a, b, c} from "./re-export-common-star"' }),
    test({ code: 'import {RuleTester} from "./re-export-node_modules"' }),

    test({
      code: 'import { jsxFoo } from "./jsx/AnotherComponent"',
      settings: { 'import-x/resolve': { extensions: ['.js', '.jsx'] } },
    }),

    test({ code: 'import { foo, bar } from "./re-export-names"' }),

    test({
      code: 'import { foo, bar } from "./common"',
      settings: { 'import-x/ignore': ['common'] },
    }),

    // ignore core modules by default
    test({ code: 'import { foo } from "crypto"' }),
    test({ code: 'import { zoob } from "a"' }),

    test({ code: 'import { someThing } from "./test-module"' }),

    // export tests
    test({ code: 'export { foo } from "./bar"' }),
    test({ code: 'export { foo as bar } from "./bar"' }),
    test({ code: 'export { foo } from "./does-not-exist"' }),

    // es7
    test({
      code: 'export bar, { foo } from "./bar"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import { foo, bar } from "./named-trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // regression tests
    test({ code: 'let foo; export { foo as bar }' }),

    // destructured exports
    test({ code: 'import { destructuredProp } from "./named-exports"' }),
    test({ code: 'import { arrayKeyProp } from "./named-exports"' }),
    test({ code: 'import { deepProp } from "./named-exports"' }),
    test({ code: 'import { deepSparseElement } from "./named-exports"' }),

    // should ignore imported/exported flow types, even if they don’t exist
    test({
      code: 'import type { MissingType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import typeof { MissingType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import type { MyOpaqueType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import typeof { MyOpaqueType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import { type MyOpaqueType, MyClass } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import { typeof MyOpaqueType, MyClass } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import typeof MissingType from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import typeof * as MissingType from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'export type { MissingType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'export type { MyOpaqueType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // jsnext
    test({
      code: '/*jsnext*/ import { createStore } from "redux"',
      settings: { 'import-x/ignore': [] },
    }),
    // should work without ignore
    test({
      code: '/*jsnext*/ import { createStore } from "redux"',
    }),

    // ignore is ignored if exports are found
    test({ code: 'import { foo } from "es6-module"' }),

    // issue #210: shameless self-reference
    test({ code: 'import { me, soGreat } from "./narcissist"' }),

    // issue #251: re-export default as named
    test({ code: 'import { foo, bar, baz } from "./re-export-default"' }),
    test({
      code: 'import { common } from "./re-export-default"',
      settings: { 'import-x/ignore': ['common'] },
    }),

    // ignore CJS by default. always ignore ignore list
    test({
      code: 'import {a, b, d} from "./common"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import { baz } from "./bar"',
      settings: { 'import-x/ignore': ['bar'] },
    }),
    test({
      code: 'import { common } from "./re-export-default"',
    }),

    // destructured requires with commonjs option
    test({
      code: 'const { destructuredProp } = require("./named-exports")',
      options: [{ commonjs: true }],
    }),
    test({
      code: 'let { arrayKeyProp } = require("./named-exports")',
      options: [{ commonjs: true }],
    }),
    test({
      code: 'const { deepProp } = require("./named-exports")',
      options: [{ commonjs: true }],
    }),

    test({
      code: 'const { foo, bar } = require("./re-export-names")',
      options: [{ commonjs: true }],
    }),

    test({
      code: 'const { baz } = require("./bar")',
      errors: [createNotFoundError('baz', './bar')],
    }),

    test({
      code: 'const { baz } = require("./bar")',
      errors: [createNotFoundError('baz', './bar')],
      options: [{ commonjs: false }],
    }),

    test({
      code: 'const { default: defExport } = require("./bar")',
      options: [{ commonjs: true }],
    }),

    ...SYNTAX_VALID_CASES,

    test({
      code: `import { ExtfieldModel, Extfield2Model } from './models';`,
      filename: testFilePath('./export-star/downstream.js'),
      languageOptions: {
        parserOptions: {
          sourceType: 'module',
          ecmaVersion: 2020,
        },
      },
    }),

    test({
      code: 'const { something } = require("./dynamic-import-in-commonjs")',
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
      options: [{ commonjs: true }],
    }),

    test({
      code: 'import { something } from "./dynamic-import-in-commonjs"',
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
    }),

    test({
      code: 'import { "foo" as foo } from "./bar"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
    test({
      code: 'import { "foo" as foo } from "./empty-module"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],

  invalid: [
    test({
      code: 'import { somethingElse } from "./test-module"',
      errors: [createNotFoundError('somethingElse', './test-module')],
    }),

    test({
      code: 'import { baz } from "./bar"',
      errors: [createNotFoundError('baz', './bar')],
    }),

    // test multiple
    test({
      code: 'import { baz, bop } from "./bar"',
      errors: [
        createNotFoundError('baz', './bar'),
        createNotFoundError('bop', './bar'),
      ],
    }),

    test({
      code: 'import {a, b, c} from "./named-exports"',
      errors: [createNotFoundError('c', './named-exports')],
    }),

    test({
      code: 'import { a } from "./default-export"',
      errors: [createNotFoundError('a', './default-export')],
    }),

    test({
      code: 'import { ActionTypess } from "./qc"',
      errors: [createNotFoundError('ActionTypess', './qc')],
    }),

    test({
      code: 'import {a, b, c, d, e} from "./re-export"',
      errors: [createNotFoundError('e', './re-export')],
    }),

    test({
      code: 'import { a } from "./re-export-names"',
      errors: [createNotFoundError('a', './re-export-names')],
    }),

    // export tests
    test({
      code: 'export { bar } from "./bar"',
      errors: [createNotFoundError('bar', './bar')],
    }),

    // es7
    test({
      code: 'export bar2, { bar } from "./bar"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [createNotFoundError('bar', './bar')],
    }),
    test({
      code: 'import { foo, bar, baz } from "./named-trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [createNotFoundError('baz', './named-trampoline')],
    }),
    test({
      code: 'import { baz } from "./broken-trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        createNotFoundDeepError(
          'baz',
          'broken-trampoline.js -> named-exports.js',
        ),
      ],
    }),

    test({
      code: 'const { baz } = require("./bar")',
      errors: [createNotFoundError('baz', './bar')],
      options: [{ commonjs: true }],
    }),

    test({
      code: 'let { baz } = require("./bar")',
      errors: [createNotFoundError('baz', './bar')],
      options: [{ commonjs: true }],
    }),

    test({
      code: 'const { baz: bar, bop } = require("./bar"), { a } = require("./re-export-names")',
      errors: [
        createNotFoundError('baz', './bar'),
        createNotFoundError('bop', './bar'),
        createNotFoundError('a', './re-export-names'),
      ],
      options: [{ commonjs: true }],
    }),

    test({
      code: 'const { default: defExport } = require("./named-exports")',
      errors: [createNotFoundError('default', './named-exports')],
      options: [{ commonjs: true }],
    }),

    // parse errors
    // test({
    //   code: "import { a } from './test.coffee';",
    //   settings: { 'import-x/extensions': ['.js', '.coffee'] },
    //   errors: [{
    //     message: "Parse errors in imported module './test.coffee': Unexpected token > (1:20)",
    //     type: 'Literal',
    //   }],
    // }),

    test({
      code: 'import  { type MyOpaqueType, MyMissingClass } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [createNotFoundError('MyMissingClass', './flowtypes')],
    }),

    // jsnext
    test({
      code: '/*jsnext*/ import { createSnorlax } from "redux"',
      settings: { 'import-x/ignore': [] },
      errors: [createNotFoundError('createSnorlax', 'redux')],
    }),
    // should work without ignore
    test({
      code: '/*jsnext*/ import { createSnorlax } from "redux"',
      errors: [createNotFoundError('createSnorlax', 'redux')],
    }),

    // ignore is ignored if exports are found
    test({
      code: 'import { baz } from "es6-module"',
      errors: [createNotFoundError('baz', 'es6-module')],
    }),

    // issue #251
    test({
      code: 'import { foo, bar, bap } from "./re-export-default"',
      errors: [createNotFoundError('bap', './re-export-default')],
    }),

    // #328: * exports do not include default
    test({
      code: 'import { default as barDefault } from "./re-export"',
      errors: [createNotFoundError('default', './re-export')],
    }),

    test({
      code: 'import { "somethingElse" as somethingElse } from "./test-module"',
      errors: [
        createNotFoundError('somethingElse', './test-module', 'Literal'),
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
    test({
      code: 'import { "baz" as baz, "bop" as bop } from "./bar"',
      errors: [
        createNotFoundError('baz', './bar', 'Literal'),
        createNotFoundError('bop', './bar', 'Literal'),
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
    test({
      code: 'import { "default" as barDefault } from "./re-export"',
      errors: [createNotFoundError('default', './re-export', 'Literal')],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
})

// #311: import of mismatched case
if (!CASE_SENSITIVE_FS) {
  describe('path case-insensitivity', () => {
    ruleTester.run('named', rule, {
      valid: [
        test({
          code: 'import { b } from "./Named-Exports"',
        }),
      ],
      invalid: [
        test({
          code: 'import { foo } from "./Named-Exports"',
          errors: [createNotFoundError('foo', './Named-Exports')],
        }),
      ],
    })
  })
}

// export-all
describe('export *', () => {
  ruleTester.run('named', rule, {
    valid: [
      test({
        code: 'import { foo } from "./export-all"',
      }),
    ],
    invalid: [
      test({
        code: 'import { bar } from "./export-all"',
        errors: [createNotFoundError('bar', './export-all')],
      }),
    ],
  })
})

describe('TypeScript', () => {
  const settings = {
    'import-x/parsers': { [parsers.TS]: ['.ts'] },
    'import-x/resolver': { 'eslint-import-resolver-typescript': true },
  }

  let valid: RunTests<typeof rule>['valid'] = [
    test({
      code: `import x from './typescript-export-assign-object'`,
      languageOptions: {
        parserOptions: {
          tsconfigRootDir: path.resolve(
            __dirname,
            '../fixtures/typescript-export-assign-object/',
          ),
        },
      },
      settings,
    }),
  ]

  let invalid: RunTests<typeof rule>['invalid'] = [
    // TODO: uncomment this test
    // test({
    //   code: `import {a} from './export-star-3/b';`,
    //   filename: testFilePath('./export-star-3/a.js'),
    //   parser,
    //   settings,
    //   errors: [
    //     { message: 'a not found in ./export-star-3/b' },
    //   ],
    // }),
    test({
      code: `import { NotExported } from './typescript-export-assign-object'`,
      languageOptions: {
        parserOptions: {
          tsconfigRootDir: path.resolve(
            __dirname,
            '../fixtures/typescript-export-assign-object/',
          ),
        },
      },
      settings,
      errors: [
        createNotFoundError('NotExported', './typescript-export-assign-object'),
      ],
    }),
    test({
      // `export =` syntax creates a default export only
      code: `import { FooBar } from './typescript-export-assign-object'`,
      languageOptions: {
        parserOptions: {
          tsconfigRootDir: path.resolve(
            __dirname,
            '../fixtures/typescript-export-assign-object/',
          ),
        },
      },
      settings,
      errors: [
        createNotFoundError('FooBar', './typescript-export-assign-object'),
      ],
    }),
  ]

  for (const source of [
    'typescript',
    'typescript-declare',
    'typescript-export-assign-namespace',
    'typescript-export-assign-namespace-merged',
  ]) {
    valid = [
      ...valid,
      test({
        code: `import { MyType } from "./${source}"`,

        settings,
      }),
      test({
        code: `import { Foo } from "./${source}"`,

        settings,
      }),
      test({
        code: `import { Bar } from "./${source}"`,

        settings,
      }),
      test({
        code: `import { getFoo } from "./${source}"`,

        settings,
      }),
      test({
        code: `import { MyEnum } from "./${source}"`,

        settings,
      }),
      test({
        code: `
            import { MyModule } from "./${source}"
            MyModule.ModuleFunction()
          `,

        settings,
      }),
      test({
        code: `
            import { MyNamespace } from "./${source}"
            MyNamespace.NSModule.NSModuleFunction()
          `,

        settings,
      }),
    ]

    invalid = [
      ...invalid,
      test({
        code: `import { MissingType } from "./${source}"`,

        settings,
        errors: [createNotFoundError('MissingType', `./${source}`)],
      }),
      test({
        code: `import { NotExported } from "./${source}"`,

        settings,
        errors: [createNotFoundError('NotExported', `./${source}`)],
      }),
    ]
  }

  ruleTester.run(`named`, rule, {
    valid,
    invalid,
  })
})
