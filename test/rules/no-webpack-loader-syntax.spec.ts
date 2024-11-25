import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-webpack-loader-syntax'

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-webpack-loader-syntax', rule, {
  valid: [
    tValid({ code: 'import _ from "lodash"' }),
    tValid({ code: 'import find from "lodash.find"' }),
    tValid({ code: 'import foo from "./foo.css"' }),
    tValid({ code: 'import data from "@scope/my-package/data.json"' }),
    tValid({ code: 'var _ = require("lodash")' }),
    tValid({ code: 'var find = require("lodash.find")' }),
    tValid({ code: 'var foo = require("./foo")' }),
    tValid({ code: 'var foo = require("../foo")' }),
    tValid({ code: 'var foo = require("foo")' }),
    tValid({ code: 'var foo = require("./")' }),
    tValid({ code: 'var foo = require("@scope/foo")' }),
  ],
  invalid: [
    tInvalid({
      code: 'import _ from "babel!lodash"',
      errors: [{ messageId: 'unexpected', data: { name: 'babel!lodash' } }],
    }),
    tInvalid({
      code: 'import find from "-babel-loader!lodash.find"',
      errors: [
        {
          messageId: 'unexpected',
          data: { name: '-babel-loader!lodash.find' },
        },
      ],
    }),
    tInvalid({
      code: 'import foo from "style!css!./foo.css"',
      errors: [
        { messageId: 'unexpected', data: { name: 'style!css!./foo.css' } },
      ],
    }),
    tInvalid({
      code: 'import data from "json!@scope/my-package/data.json"',
      errors: [
        {
          messageId: 'unexpected',
          data: { name: 'json!@scope/my-package/data.json' },
        },
      ],
    }),
    tInvalid({
      code: 'var _ = require("babel!lodash")',
      errors: [{ messageId: 'unexpected', data: { name: 'babel!lodash' } }],
    }),
    tInvalid({
      code: 'var find = require("-babel-loader!lodash.find")',
      errors: [
        {
          messageId: 'unexpected',
          data: { name: '-babel-loader!lodash.find' },
        },
      ],
    }),
    tInvalid({
      code: 'var foo = require("style!css!./foo.css")',
      errors: [
        { messageId: 'unexpected', data: { name: 'style!css!./foo.css' } },
      ],
    }),
    tInvalid({
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
