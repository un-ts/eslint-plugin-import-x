import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'

import { parsers, createRuleTestCaseFunctions } from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/no-dynamic-require'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const REQUIRE_ERROR = { messageId: 'require' } as const
const DYNAMIC_IMPORT_ERROR = { messageId: 'import' } as const

ruleTester.run('no-dynamic-require', rule, {
  valid: [
    tValid({ code: 'import _ from "lodash"' }),
    tValid({ code: 'require("foo")' }),
    tValid({ code: 'require(`foo`)' }),
    tValid({ code: 'require("./foo")' }),
    tValid({ code: 'require("@scope/foo")' }),
    tValid({ code: 'require()' }),
    tValid({ code: 'require("./foo", "bar" + "okay")' }),
    tValid({ code: 'var foo = require("foo")' }),
    tValid({ code: 'var foo = require(`foo`)' }),
    tValid({ code: 'var foo = require("./foo")' }),
    tValid({ code: 'var foo = require("@scope/foo")' }),

    //dynamic import
    ...[parsers.ESPREE, parsers.BABEL].flatMap($parser => {
      const _test: typeof tValid = testObj =>
        $parser === parsers.ESPREE ? testObj : tValid(testObj)

      const parser = cjsRequire<TSESLint.Parser.LooseParserModule>($parser)

      return [
        _test({
          code: 'import("foo")',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import(`foo`)',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import("./foo")',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import("@scope/foo")',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'var foo = import("foo")',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'var foo = import(`foo`)',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'var foo = import("./foo")',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'var foo = import("@scope/foo")',
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import("../" + name)',
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import(`../${name}`)',
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
      ]
    }),
  ],
  invalid: [
    tInvalid({
      code: 'require("../" + name)',
      errors: [REQUIRE_ERROR],
    }),
    tInvalid({
      code: 'require(`../${name}`)',
      errors: [REQUIRE_ERROR],
    }),
    tInvalid({
      code: 'require(name)',
      errors: [REQUIRE_ERROR],
    }),
    tInvalid({
      code: 'require(name())',
      errors: [REQUIRE_ERROR],
    }),
    tInvalid({
      code: 'require(name + "foo", "bar")',
      errors: [REQUIRE_ERROR],
      options: [{ esmodule: true }],
    }),

    // dynamic import
    ...[parsers.ESPREE, parsers.BABEL].flatMap($parser => {
      const _test: typeof tInvalid = testObj =>
        $parser === parsers.ESPREE ? testObj : tInvalid(testObj)

      const parser = cjsRequire<TSESLint.Parser.LooseParserModule>($parser)

      return [
        _test({
          code: 'import("../" + name)',
          errors: [DYNAMIC_IMPORT_ERROR],
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import(`../${name}`)',
          errors: [DYNAMIC_IMPORT_ERROR],
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import(name)',
          errors: [DYNAMIC_IMPORT_ERROR],
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
        _test({
          code: 'import(name())',
          errors: [DYNAMIC_IMPORT_ERROR],
          options: [{ esmodule: true }],
          languageOptions: {
            parser,
            parserOptions: {
              ecmaVersion: 2020,
            },
          },
        }),
      ]
    }),
    tInvalid({
      code: 'require(`foo${x}`)',
      errors: [REQUIRE_ERROR],
    }),
    tInvalid({
      code: 'var foo = require(`foo${x}`)',
      errors: [REQUIRE_ERROR],
    }),
  ],
})
