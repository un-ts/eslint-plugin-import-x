import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunction, parsers } from '../utils'
import type { GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-absolute-path'

const ruleTester = new TSESLintRuleTester()

const test = createRuleTestCaseFunction<typeof rule>()

const ABSOLUTE_ERROR: TSESLintTestCaseError<
  GetRuleModuleMessageIds<typeof rule>
> = {
  messageId: 'absolute',
}

const absolutePath = (testPath: string) => path.join(__dirname, testPath)

ruleTester.run('no-absolute-path', rule, {
  valid: [
    test({ code: 'import _ from "lodash"' }),
    test({ code: 'import find from "lodash.find"' }),
    test({ code: 'import foo from "./foo"' }),
    test({ code: 'import foo from "../foo"' }),
    test({ code: 'import foo from "foo"' }),
    test({ code: 'import foo from "./"' }),
    test({ code: 'import foo from "@scope/foo"' }),
    test({ code: 'var _ = require("lodash")' }),
    test({ code: 'var find = require("lodash.find")' }),
    test({ code: 'var foo = require("./foo")' }),
    test({ code: 'var foo = require("../foo")' }),
    test({ code: 'var foo = require("foo")' }),
    test({ code: 'var foo = require("./")' }),
    test({ code: 'var foo = require("@scope/foo")' }),

    test({ code: 'import events from "events"' }),
    test({ code: 'import path from "path"' }),
    test({ code: 'var events = require("events")' }),
    test({ code: 'var path = require("path")' }),
    test({ code: 'import path from "path";import events from "events"' }),

    // still works if only `amd: true` is provided
    test({
      code: 'import path from "path"',
      options: [{ amd: true }],
    }),

    // amd not enabled by default
    test({ code: 'require(["/some/path"], function (f) { /* ... */ })' }),
    test({
      code: 'define(["/some/path"], function (f) { /* ... */ })',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    test({
      code: 'require(["./some/path"], function (f) { /* ... */ })',
      options: [{ amd: true }],
    }),
    test({
      code: 'define(["./some/path"], function (f) { /* ... */ })',
      options: [{ amd: true }],
    }),
  ],
  invalid: [
    test({
      code: `import f from "${absolutePath('/foo')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from ".."',
    }),
    test({
      code: `import f from "${absolutePath('/foo/bar/baz.js')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "./baz.js"',
    }),
    test({
      code: `import f from "${absolutePath('/foo/path')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "../path"',
    }),
    test({
      code: `import f from "${absolutePath('/some/path')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "../../some/path"',
    }),
    test({
      code: `import f from "${absolutePath('/some/path')}"`,
      filename: absolutePath('/foo/bar/index.js'),
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'import f from "../../some/path"',
    }),
    test({
      code: `var f = require("${absolutePath('/foo')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("..")',
    }),
    test({
      code: `var f = require("${absolutePath('/foo/path')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("../path")',
    }),
    test({
      code: `var f = require("${absolutePath('/some/path')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("../../some/path")',
    }),
    test({
      code: `var f = require("${absolutePath('/some/path')}")`,
      filename: absolutePath('/foo/bar/index.js'),
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'var f = require("../../some/path")',
    }),
    // validate amd
    test({
      code: `require(["${absolutePath('/some/path')}"], function (f) { /* ... */ })`,
      filename: absolutePath('/foo/bar/index.js'),
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'require(["../../some/path"], function (f) { /* ... */ })',
    }),
    test({
      code: `define(["${absolutePath('/some/path')}"], function (f) { /* ... */ })`,
      filename: absolutePath('/foo/bar/index.js'),
      languageOptions: { parser: require(parsers.ESPREE) },
      options: [{ amd: true }],
      errors: [ABSOLUTE_ERROR],
      output: 'define(["../../some/path"], function (f) { /* ... */ })',
    }),
  ],
})
