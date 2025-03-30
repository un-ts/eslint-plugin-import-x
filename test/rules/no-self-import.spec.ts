import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-self-import'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('no-self-import', rule, {
  valid: [
    tValid({
      code: 'import _ from "lodash"',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'import find from "lodash.find"',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'import foo from "./foo"',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'import foo from "../foo"',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'import foo from "foo"',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'import foo from "./"',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'import foo from "@scope/foo"',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var _ = require("lodash")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var find = require("lodash.find")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var foo = require("./foo")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var foo = require("../foo")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var foo = require("foo")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var foo = require("./")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var foo = require("@scope/foo")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var bar = require("./bar/index")',
      filename: testFilePath('./no-self-import.js'),
    }),
    tValid({
      code: 'var bar = require("./bar")',
      filename: testFilePath('./bar/index.js'),
    }),
    tValid({
      code: 'var bar = require("./bar")',
      filename: '<text>',
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import bar from "./no-self-import"',
      filename: testFilePath('./no-self-import.js'),
      errors: [{ messageId: 'self' }],
    }),
    tInvalid({
      code: 'var bar = require("./no-self-import")',
      filename: testFilePath('./no-self-import.js'),
      errors: [{ messageId: 'self' }],
    }),
    tInvalid({
      code: 'var bar = require("./no-self-import.js")',
      filename: testFilePath('./no-self-import.js'),
      errors: [{ messageId: 'self' }],
    }),
    tInvalid({
      code: 'var bar = require(".")',
      filename: testFilePath('./index.js'),
      errors: [{ messageId: 'self' }],
    }),
    tInvalid({
      code: 'var bar = require("./")',
      filename: testFilePath('./index.js'),
      errors: [{ messageId: 'self' }],
    }),
    tInvalid({
      code: 'var bar = require("././././")',
      filename: testFilePath('./index.js'),
      errors: [{ messageId: 'self' }],
    }),
    tInvalid({
      code: 'var bar = require("../no-self-import-folder")',
      filename: testFilePath('./no-self-import-folder/index.js'),
      errors: [{ messageId: 'self' }],
    }),
  ],
})
