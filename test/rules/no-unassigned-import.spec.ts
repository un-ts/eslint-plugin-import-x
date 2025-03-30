import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-unassigned-import'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('no-unassigned-import', rule, {
  valid: [
    tValid({ code: 'import _, {foo} from "lodash"' }),
    tValid({ code: 'import _ from "lodash"' }),
    tValid({ code: 'import _, {foo as bar} from "lodash"' }),
    tValid({ code: 'import {foo as bar} from "lodash"' }),
    tValid({ code: 'import * as _ from "lodash"' }),
    tValid({ code: 'import _ from "./"' }),
    tValid({ code: 'const _ = require("lodash")' }),
    tValid({ code: 'const {foo} = require("lodash")' }),
    tValid({ code: 'const {foo: bar} = require("lodash")' }),
    tValid({ code: 'const [a, b] = require("lodash")' }),
    tValid({ code: 'const _ = require("./")' }),
    tValid({ code: 'foo(require("lodash"))' }),
    tValid({ code: 'require("lodash").foo' }),
    tValid({ code: 'require("lodash").foo()' }),
    tValid({ code: 'require("lodash")()' }),
    tValid({
      code: 'import "app.css"',
      options: [{ allow: ['**/*.css'] }],
    }),
    tValid({
      code: 'import "app.css";',
      options: [{ allow: ['*.css'] }],
    }),
    tValid({
      code: 'import "./app.css"',
      options: [{ allow: ['**/*.css'] }],
    }),
    tValid({
      code: 'import "foo/bar"',
      options: [{ allow: ['foo/**'] }],
    }),
    tValid({
      code: 'import "foo/bar"',
      options: [{ allow: ['foo/bar'] }],
    }),
    tValid({
      code: 'import "../dir/app.css"',
      options: [{ allow: ['**/*.css'] }],
    }),
    tValid({
      code: 'import "../dir/app.js"',
      options: [{ allow: ['**/dir/**'] }],
    }),
    tValid({
      code: 'require("./app.css")',
      options: [{ allow: ['**/*.css'] }],
    }),
    tValid({
      code: 'import "babel-register"',
      options: [{ allow: ['babel-register'] }],
    }),
    tValid({
      code: 'import "./styles/app.css"',
      filename: path.resolve('src/app.js'),
      options: [{ allow: ['src/styles/**'] }],
    }),
    tValid({
      code: 'import "../scripts/register.js"',
      filename: path.resolve('src/app.js'),
      options: [{ allow: ['src/styles/**', '**/scripts/*.js'] }],
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import "lodash"',
      errors: [{ messageId: 'unassigned' }],
    }),
    tInvalid({
      code: 'require("lodash")',
      errors: [{ messageId: 'unassigned' }],
    }),
    tInvalid({
      code: 'import "./app.css"',
      options: [{ allow: ['**/*.js'] }],
      errors: [{ messageId: 'unassigned' }],
    }),
    tInvalid({
      code: 'import "./app.css"',
      options: [{ allow: ['**/dir/**'] }],
      errors: [{ messageId: 'unassigned' }],
    }),
    tInvalid({
      code: 'require("./app.css")',
      options: [{ allow: ['**/*.js'] }],
      errors: [{ messageId: 'unassigned' }],
    }),
    tInvalid({
      code: 'import "./styles/app.css"',
      filename: path.resolve('src/app.js'),
      options: [{ allow: ['styles/*.css'] }],
      errors: [{ messageId: 'unassigned' }],
    }),
  ],
})
