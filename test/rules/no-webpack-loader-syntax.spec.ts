import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunction } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-webpack-loader-syntax'

const test = createRuleTestCaseFunction<typeof rule>()

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-webpack-loader-syntax', rule, {
  valid: [
    test({ code: 'import _ from "lodash"' }),
    test({ code: 'import find from "lodash.find"' }),
    test({ code: 'import foo from "./foo.css"' }),
    test({ code: 'import data from "@scope/my-package/data.json"' }),
    test({ code: 'var _ = require("lodash")' }),
    test({ code: 'var find = require("lodash.find")' }),
    test({ code: 'var foo = require("./foo")' }),
    test({ code: 'var foo = require("../foo")' }),
    test({ code: 'var foo = require("foo")' }),
    test({ code: 'var foo = require("./")' }),
    test({ code: 'var foo = require("@scope/foo")' }),
  ],
  invalid: [
    test({
      code: 'import _ from "babel!lodash"',
      errors: [{ messageId: 'unexpected', data: { name: 'babel!lodash' } }],
    }),
    test({
      code: 'import find from "-babel-loader!lodash.find"',
      errors: [
        {
          messageId: 'unexpected',
          data: { name: '-babel-loader!lodash.find' },
        },
      ],
    }),
    test({
      code: 'import foo from "style!css!./foo.css"',
      errors: [
        { messageId: 'unexpected', data: { name: 'style!css!./foo.css' } },
      ],
    }),
    test({
      code: 'import data from "json!@scope/my-package/data.json"',
      errors: [
        {
          messageId: 'unexpected',
          data: { name: 'json!@scope/my-package/data.json' },
        },
      ],
    }),
    test({
      code: 'var _ = require("babel!lodash")',
      errors: [{ messageId: 'unexpected', data: { name: 'babel!lodash' } }],
    }),
    test({
      code: 'var find = require("-babel-loader!lodash.find")',
      errors: [
        {
          messageId: 'unexpected',
          data: { name: '-babel-loader!lodash.find' },
        },
      ],
    }),
    test({
      code: 'var foo = require("style!css!./foo.css")',
      errors: [
        { messageId: 'unexpected', data: { name: 'style!css!./foo.css' } },
      ],
    }),
    test({
      code: 'var data = require("json!@scope/my-package/data.json")',
      errors: [
        {
          messageId: 'unexpected',
          data: { name: 'json!@scope/my-package/data.json' },
        },
      ],
    }),
  ],
})
