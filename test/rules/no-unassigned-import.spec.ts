import path from 'node:path'

import { TSESLint } from '@typescript-eslint/utils'

import { test, wrapRun } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-unassigned-import'

const ruleTester = new TSESLint.RuleTester()

const error = {
  messageId: 'unassigned',
} as const

wrapRun(ruleTester.run)('no-unassigned-import', rule, {
  valid: [
    test({ code: 'import _ from "lodash"' }),
    test({ code: 'import _, {foo} from "lodash"' }),
    test({ code: 'import _, {foo as bar} from "lodash"' }),
    test({ code: 'import {foo as bar} from "lodash"' }),
    test({ code: 'import * as _ from "lodash"' }),
    test({ code: 'import _ from "./"' }),
    test({ code: 'const _ = require("lodash")' }),
    test({ code: 'const {foo} = require("lodash")' }),
    test({ code: 'const {foo: bar} = require("lodash")' }),
    test({ code: 'const [a, b] = require("lodash")' }),
    test({ code: 'const _ = require("./")' }),
    test({ code: 'foo(require("lodash"))' }),
    test({ code: 'require("lodash").foo' }),
    test({ code: 'require("lodash").foo()' }),
    test({ code: 'require("lodash")()' }),
    test({
      code: 'import "app.css"',
      options: [{ allow: ['**/*.css'] }],
    }),
    test({
      code: 'import "app.css";',
      options: [{ allow: ['*.css'] }],
    }),
    test({
      code: 'import "./app.css"',
      options: [{ allow: ['**/*.css'] }],
    }),
    test({
      code: 'import "foo/bar"',
      options: [{ allow: ['foo/**'] }],
    }),
    test({
      code: 'import "foo/bar"',
      options: [{ allow: ['foo/bar'] }],
    }),
    test({
      code: 'import "../dir/app.css"',
      options: [{ allow: ['**/*.css'] }],
    }),
    test({
      code: 'import "../dir/app.js"',
      options: [{ allow: ['**/dir/**'] }],
    }),
    test({
      code: 'require("./app.css")',
      options: [{ allow: ['**/*.css'] }],
    }),
    test({
      code: 'import "babel-register"',
      options: [{ allow: ['babel-register'] }],
    }),
    test({
      code: 'import "./styles/app.css"',
      options: [{ allow: ['src/styles/**'] }],
      filename: path.resolve('src/app.js'),
    }),
    test({
      code: 'import "../scripts/register.js"',
      options: [{ allow: ['src/styles/**', '**/scripts/*.js'] }],
      filename: path.resolve('src/app.js'),
    }),
  ],
  invalid: [
    test({
      code: 'import "lodash"',
      errors: [error],
    }),
    test({
      code: 'require("lodash")',
      errors: [error],
    }),
    test({
      code: 'import "./app.css"',
      options: [{ allow: ['**/*.js'] }],
      errors: [error],
    }),
    test({
      code: 'import "./app.css"',
      options: [{ allow: ['**/dir/**'] }],
      errors: [error],
    }),
    test({
      code: 'require("./app.css")',
      options: [{ allow: ['**/*.js'] }],
      errors: [error],
    }),
    test({
      code: 'import "./styles/app.css"',
      options: [{ allow: ['styles/*.css'] }],
      filename: path.resolve('src/app.js'),
      errors: [error],
    }),
  ],
})
