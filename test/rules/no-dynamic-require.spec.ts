import { TSESLint } from '@typescript-eslint/utils'

import { parsers, test } from '../utils'
import type { ValidTestCase } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-dynamic-require'

const ruleTester = new TSESLint.RuleTester()

const error = {
  messageId: 'require',
} as const

const dynamicImportError = {
  messageId: 'import',
} as const

ruleTester.run('no-dynamic-require', rule, {
  valid: [
    test({ code: 'import _ from "lodash"' }),
    test({ code: 'require("foo")' }),
    test({ code: 'require(`foo`)' }),
    test({ code: 'require("./foo")' }),
    test({ code: 'require("@scope/foo")' }),
    test({ code: 'require()' }),
    test({ code: 'require("./foo", "bar" + "okay")' }),
    test({ code: 'var foo = require("foo")' }),
    test({ code: 'var foo = require(`foo`)' }),
    test({ code: 'var foo = require("./foo")' }),
    test({ code: 'var foo = require("@scope/foo")' }),

    //dynamic import
    ...[parsers.ESPREE, parsers.BABEL].flatMap(parser => {
      const _test = <T extends ValidTestCase>(testObj: T) =>
        parser === parsers.ESPREE ? testObj : test(testObj)
      return [
        _test({
          code: 'import("foo")',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import(`foo`)',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import("./foo")',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import("@scope/foo")',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'var foo = import("foo")',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'var foo = import(`foo`)',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'var foo = import("./foo")',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'var foo = import("@scope/foo")',
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import("../" + name)',
          errors: [dynamicImportError],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import(`../${name}`)',
          errors: [dynamicImportError],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
      ]
    }),
  ],
  invalid: [
    test({
      code: 'require("../" + name)',
      errors: [error],
    }),
    test({
      code: 'require(`../${name}`)',
      errors: [error],
    }),
    test({
      code: 'require(name)',
      errors: [error],
    }),
    test({
      code: 'require(name())',
      errors: [error],
    }),
    test({
      code: 'require(name + "foo", "bar")',
      errors: [error],
      options: [{ esmodule: true }],
    }),

    // dynamic import
    ...[parsers.ESPREE, parsers.BABEL].flatMap(parser => {
      const _test = <T extends ValidTestCase>(testObj: T) =>
        parser === parsers.ESPREE ? testObj : test(testObj)
      return [
        _test({
          code: 'import("../" + name)',
          errors: [dynamicImportError],
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import(`../${name}`)',
          errors: [dynamicImportError],
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import(name)',
          errors: [dynamicImportError],
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
        _test({
          code: 'import(name())',
          errors: [dynamicImportError],
          options: [{ esmodule: true }],
          parser,
          parserOptions: {
            ecmaVersion: 2020,
          },
        }),
      ]
    }),
    test({
      code: 'require(`foo${x}`)',
      errors: [error],
    }),
    test({
      code: 'var foo = require(`foo${x}`)',
      errors: [error],
    }),
  ],
})
