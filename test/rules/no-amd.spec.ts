import { RuleTester } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-amd'

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
})

ruleTester.run$('no-amd', rule, {
  valid: [
    'import "x";',
    'import x from "x"',
    'var x = require("x")',

    'require("x")',
    // 2-args, not an array
    'require("x", "y")',
    // random other function
    'setTimeout(foo, 100)',
    // non-identifier callee
    '(a || b)(1, 2, 3)',

    // nested scope is fine
    'function x() { define(["a"], function (a) {}) }',
    'function x() { require(["a"], function (a) {}) }',

    // unmatched arg types/number
    'define(0, 1, 2)',
    'define("a")',
  ],

  invalid: [
    {
      code: 'define([], function() {})',
      output: null,
      errors: [
        {
          messageId: 'amd',
          data: {
            type: 'define',
          },
        },
      ],
    },
    {
      code: 'define(["a"], function(a) { console.log(a); })',
      output: null,
      errors: [
        {
          messageId: 'amd',
          data: {
            type: 'define',
          },
        },
      ],
    },

    {
      code: 'require([], function() {})',
      output: null,
      errors: [
        {
          messageId: 'amd',
          data: {
            type: 'require',
          },
        },
      ],
    },
    {
      code: 'require(["a"], function(a) { console.log(a); })',
      output: null,
      errors: [
        {
          messageId: 'amd',
          data: {
            type: 'require',
          },
        },
      ],
    },
  ],
})
