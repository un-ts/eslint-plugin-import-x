import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { TSESTree } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  SYNTAX_VALID_CASES,
  testFilePath,
  parsers,
} from '../utils'
import type { RuleRunTests, GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/named'
import { CASE_SENSITIVE_FS } from 'eslint-plugin-import-x/utils'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

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
    tValid({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),

    tValid({ code: 'import { foo } from "./bar"' }),
    tValid({ code: 'import { foo } from "./empty-module"' }),
    tValid({ code: 'import bar from "./bar.js"' }),
    tValid({ code: 'import bar, { foo } from "./bar.js"' }),
    tValid({ code: 'import {a, b, d} from "./named-exports"' }),
    tValid({ code: 'import {ExportedClass} from "./named-exports"' }),
    tValid({ code: 'import { destructingAssign } from "./named-exports"' }),
    tValid({
      code: 'import { destructingRenamedAssign } from "./named-exports"',
    }),
    tValid({ code: 'import { ActionTypes } from "./qc"' }),
    tValid({ code: 'import {a, b, c, d} from "./re-export"' }),
    tValid({ code: 'import {a, b, c} from "./re-export-common-star"' }),
    tValid({ code: 'import {RuleTester} from "./re-export-node_modules"' }),

    tValid({
      code: 'import { jsxFoo } from "./jsx/AnotherComponent"',
      settings: { 'import-x/resolve': { extensions: ['.js', '.jsx'] } },
    }),

    tValid({ code: 'import { foo, bar } from "./re-export-names"' }),

    tValid({
      code: 'import { foo, bar } from "./common"',
      settings: { 'import-x/ignore': ['common'] },
    }),

    // ignore core modules by default
    tValid({ code: 'import { foo } from "crypto"' }),
    tValid({ code: 'import { zoob } from "a"' }),

    tValid({ code: 'import { someThing } from "./test-module"' }),

    // export tests
    tValid({ code: 'export { foo } from "./bar"' }),
    tValid({ code: 'export { foo as bar } from "./bar"' }),
    tValid({ code: 'export { foo } from "./does-not-exist"' }),

    // es7
    tValid({
      code: 'export bar, { foo } from "./bar"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { foo, bar } from "./named-trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // regression tests
    tValid({ code: 'let foo; export { foo as bar }' }),

    // destructured exports
    tValid({ code: 'import { destructuredProp } from "./named-exports"' }),
    tValid({ code: 'import { arrayKeyProp } from "./named-exports"' }),
    tValid({ code: 'import { deepProp } from "./named-exports"' }),
    tValid({ code: 'import { deepSparseElement } from "./named-exports"' }),

    // should ignore imported/exported flow types, even if they don’t exist
    tValid({
      code: 'import type { MissingType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import typeof { MissingType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import type { MyOpaqueType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import typeof { MyOpaqueType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { type MyOpaqueType, MyClass } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { typeof MyOpaqueType, MyClass } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import typeof MissingType from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import typeof * as MissingType from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export type { MissingType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export type { MyOpaqueType } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // jsnext
    tValid({
      code: '/*jsnext*/ import { createStore } from "redux"',
      settings: { 'import-x/ignore': [] },
    }),
    // should work without ignore
    tValid({
      code: '/*jsnext*/ import { createStore } from "redux"',
    }),

    // ignore is ignored if exports are found
    tValid({ code: 'import { foo } from "es6-module"' }),

    // issue #210: shameless self-reference
    tValid({ code: 'import { me, soGreat } from "./narcissist"' }),

    // issue #251: re-export default as named
    tValid({ code: 'import { foo, bar, baz } from "./re-export-default"' }),
    tValid({
      code: 'import { common } from "./re-export-default"',
      settings: { 'import-x/ignore': ['common'] },
    }),

    // ignore CJS by default. always ignore ignore list
    tValid({
      code: 'import {a, b, d} from "./common"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { baz } from "./bar"',
      settings: { 'import-x/ignore': ['bar'] },
    }),
    tValid({
      code: 'import { common } from "./re-export-default"',
    }),

    // destructured requires with commonjs option
    tValid({
      code: 'const { destructuredProp } = require("./named-exports")',
      options: [{ commonjs: true }],
    }),
    tValid({
      code: 'let { arrayKeyProp } = require("./named-exports")',
      options: [{ commonjs: true }],
    }),
    tValid({
      code: 'const { deepProp } = require("./named-exports")',
      options: [{ commonjs: true }],
    }),

    tValid({
      code: 'const { foo, bar } = require("./re-export-names")',
      options: [{ commonjs: true }],
    }),

    tValid({
      code: 'const { baz } = require("./bar")',
    }),

    tValid({
      code: 'const { baz } = require("./bar")',
      options: [{ commonjs: false }],
    }),

    tValid({
      code: 'const { default: defExport } = require("./bar")',
      options: [{ commonjs: true }],
    }),

    ...SYNTAX_VALID_CASES,

    tValid({
      code: `import { ExtfieldModel, Extfield2Model } from './models';`,
      filename: testFilePath('./export-star/downstream.js'),
      languageOptions: {
        parserOptions: {
          sourceType: 'module',
          ecmaVersion: 2020,
        },
      },
    }),

    tValid({
      code: 'const { something } = require("./dynamic-import-in-commonjs")',
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
      options: [{ commonjs: true }],
    }),

    tValid({
      code: 'import { something } from "./dynamic-import-in-commonjs"',
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
    }),

    tValid({
      code: 'import { "foo" as foo } from "./bar"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
    tValid({
      code: 'import { "foo" as foo } from "./empty-module"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import { somethingElse } from "./test-module"',
      errors: [createNotFoundError('somethingElse', './test-module')],
    }),

    tInvalid({
      code: 'import { baz } from "./bar"',
      errors: [createNotFoundError('baz', './bar')],
    }),

    // test multiple
    tInvalid({
      code: 'import { baz, bop } from "./bar"',
      errors: [
        createNotFoundError('baz', './bar'),
        createNotFoundError('bop', './bar'),
      ],
    }),

    tInvalid({
      code: 'import {a, b, c} from "./named-exports"',
      errors: [createNotFoundError('c', './named-exports')],
    }),

    tInvalid({
      code: 'import { a } from "./default-export"',
      errors: [createNotFoundError('a', './default-export')],
    }),

    tInvalid({
      code: 'import { ActionTypess } from "./qc"',
      errors: [createNotFoundError('ActionTypess', './qc')],
    }),

    tInvalid({
      code: 'import {a, b, c, d, e} from "./re-export"',
      errors: [createNotFoundError('e', './re-export')],
    }),

    tInvalid({
      code: 'import { a } from "./re-export-names"',
      errors: [createNotFoundError('a', './re-export-names')],
    }),

    // export tests
    tInvalid({
      code: 'export { bar } from "./bar"',
      errors: [createNotFoundError('bar', './bar')],
    }),

    // es7
    tInvalid({
      code: 'export bar2, { bar } from "./bar"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [createNotFoundError('bar', './bar')],
    }),
    tInvalid({
      code: 'import { foo, bar, baz } from "./named-trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [createNotFoundError('baz', './named-trampoline')],
    }),
    tInvalid({
      code: 'import { baz } from "./broken-trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        createNotFoundDeepError(
          'baz',
          'broken-trampoline.js -> named-exports.js',
        ),
      ],
    }),

    tInvalid({
      code: 'const { baz } = require("./bar")',
      errors: [createNotFoundError('baz', './bar')],
      options: [{ commonjs: true }],
    }),

    tInvalid({
      code: 'let { baz } = require("./bar")',
      errors: [createNotFoundError('baz', './bar')],
      options: [{ commonjs: true }],
    }),

    tInvalid({
      code: 'const { baz: bar, bop } = require("./bar"), { a } = require("./re-export-names")',
      errors: [
        createNotFoundError('baz', './bar'),
        createNotFoundError('bop', './bar'),
        createNotFoundError('a', './re-export-names'),
      ],
      options: [{ commonjs: true }],
    }),

    tInvalid({
      code: 'const { default: defExport } = require("./named-exports")',
      errors: [createNotFoundError('default', './named-exports')],
      options: [{ commonjs: true }],
    }),

    // parse errors
    // tInvalid({
    //   code: "import { a } from './test.coffee';",
    //   settings: { 'import-x/extensions': ['.js', '.coffee'] },
    //   errors: [{
    //     message: "Parse errors in imported module './test.coffee': Unexpected token > (1:20)",
    //     type: 'Literal',
    //   }],
    // }),

    tInvalid({
      code: 'import  { type MyOpaqueType, MyMissingClass } from "./flowtypes"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [createNotFoundError('MyMissingClass', './flowtypes')],
    }),

    // jsnext
    tInvalid({
      code: '/*jsnext*/ import { createSnorlax } from "redux"',
      settings: { 'import-x/ignore': [] },
      errors: [createNotFoundError('createSnorlax', 'redux')],
    }),
    // should work without ignore
    tInvalid({
      code: '/*jsnext*/ import { createSnorlax } from "redux"',
      errors: [createNotFoundError('createSnorlax', 'redux')],
    }),

    // ignore is ignored if exports are found
    tInvalid({
      code: 'import { baz } from "es6-module"',
      errors: [createNotFoundError('baz', 'es6-module')],
    }),

    // issue #251
    tInvalid({
      code: 'import { foo, bar, bap } from "./re-export-default"',
      errors: [createNotFoundError('bap', './re-export-default')],
    }),

    // #328: * exports do not include default
    tInvalid({
      code: 'import { default as barDefault } from "./re-export"',
      errors: [createNotFoundError('default', './re-export')],
    }),

    tInvalid({
      code: 'import { "somethingElse" as somethingElse } from "./test-module"',
      errors: [
        createNotFoundError('somethingElse', './test-module', 'Literal'),
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
    tInvalid({
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
    tInvalid({
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
        tValid({
          code: 'import { b } from "./Named-Exports"',
        }),
      ],
      invalid: [
        tInvalid({
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
      tValid({
        code: 'import { foo } from "./export-all"',
      }),
    ],
    invalid: [
      tInvalid({
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

  let valid: RuleRunTests<typeof rule>['valid'] = [
    tValid({
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

  let invalid: RuleRunTests<typeof rule>['invalid'] = [
    // TODO: uncomment this test
    // tInvalid({
    //   code: `import {a} from './export-star-3/b';`,
    //   filename: testFilePath('./export-star-3/a.js'),
    //   parser,
    //   settings,
    //   errors: [
    //     { message: 'a not found in ./export-star-3/b' },
    //   ],
    // }),
    tInvalid({
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
    tInvalid({
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
      tValid({
        code: `import { MyType } from "./${source}"`,

        settings,
      }),
      tValid({
        code: `import { Foo } from "./${source}"`,

        settings,
      }),
      tValid({
        code: `import { Bar } from "./${source}"`,

        settings,
      }),
      tValid({
        code: `import { getFoo } from "./${source}"`,

        settings,
      }),
      tValid({
        code: `import { MyEnum } from "./${source}"`,

        settings,
      }),
      tValid({
        code: `
            import { MyModule } from "./${source}"
            MyModule.ModuleFunction()
          `,

        settings,
      }),
      tValid({
        code: `
            import { MyNamespace } from "./${source}"
            MyNamespace.NSModule.NSModuleFunction()
          `,

        settings,
      }),
    ]

    invalid = [
      ...invalid,
      tInvalid({
        code: `import { MissingType } from "./${source}"`,

        settings,
        errors: [createNotFoundError('MissingType', `./${source}`)],
      }),
      tInvalid({
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
