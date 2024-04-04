import { test, SYNTAX_CASES, parsers, RuleTester } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-named-default'

const ruleTester = new RuleTester()

ruleTester.run$('no-named-default', rule, {
  valid: [
    test({ code: 'import bar from "./bar";' }),
    test({ code: 'import bar, { foo } from "./bar";' }),

    // Should ignore imported flow types
    test({
      code: 'import { type default as Foo } from "./bar";',
      parser: parsers.BABEL,
    }),
    test({
      code: 'import { typeof default as Foo } from "./bar";',
      parser: parsers.BABEL,
    }),

    ...SYNTAX_CASES,
  ],

  invalid: [
    /*test({
      code: 'import { default } from "./bar";',
      errors: [{
        message: 'Use default import syntax to import \'default\'.',
        type: 'Identifier',
      }],
      parser: parsers.BABEL,
    }),*/
    test({
      code: 'import { default as bar } from "./bar";',
      errors: [
        {
          message: "Use default import syntax to import 'bar'.",
          type: 'Identifier',
        },
      ],
    }),
    test({
      code: 'import { foo, default as bar } from "./bar";',
      errors: [
        {
          message: "Use default import syntax to import 'bar'.",
          type: 'Identifier',
        },
      ],
    }),

    test({
      code: 'import { "default" as bar } from "./bar";',
      errors: [
        {
          message: "Use default import syntax to import 'bar'.",
          type: 'Identifier',
        },
      ],
      parserOptions: {
        ecmaVersion: 2022,
      },
    }),
  ],
})
