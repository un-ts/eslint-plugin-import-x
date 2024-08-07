import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { test, SYNTAX_CASES, parsers } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-named-as-default'

const ruleTester = new TSESLintRuleTester()

console.log({ babel: require(parsers.BABEL) })

ruleTester.run('no-named-as-default', rule, {
  valid: [
    test({ code: 'import "./malformed.js"' }),

    test({ code: 'import bar, { foo } from "./bar";' }),
    test({ code: 'import bar, { foo } from "./empty-folder";' }),

    // es7
    test({
      code: 'export bar, { foo } from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'export bar from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // #566: don't false-positive on `default` itself
    test({
      code: 'export default from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    test({
      code: 'import bar, { foo } from "./export-default-string-and-named"',
      languageOptions: { parserOptions: { ecmaVersion: 2022 } },
    }),

    ...SYNTAX_CASES,
  ],

  invalid: [
    test({
      code: 'import foo from "./bar";',
      errors: [
        {
          message:
            "Using exported name 'foo' as identifier for default export.",
          type: 'ImportDefaultSpecifier',
        },
      ],
    }),
    test({
      code: 'import foo, { foo as bar } from "./bar";',
      errors: [
        {
          message:
            "Using exported name 'foo' as identifier for default export.",
          type: 'ImportDefaultSpecifier',
        },
      ],
    }),

    // es7
    test({
      code: 'export foo from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          message:
            "Using exported name 'foo' as identifier for default export.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExportDefaultSpecifier is unavailable yet
          type: 'ExportDefaultSpecifier' as any,
        },
      ],
    }),
    test({
      code: 'export foo, { foo as bar } from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          message:
            "Using exported name 'foo' as identifier for default export.",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ExportDefaultSpecifier is unavailable yet
          type: 'ExportDefaultSpecifier' as any,
        },
      ],
    }),

    test({
      code: 'import foo from "./malformed.js"',
      errors: [
        {
          message:
            "Parse errors in imported module './malformed.js': 'return' outside of function (1:1)",
          type: 'Literal',
        },
      ],
    }),

    test({
      code: 'import foo from "./export-default-string-and-named"',
      errors: [
        {
          message:
            "Using exported name 'foo' as identifier for default export.",
          type: 'ImportDefaultSpecifier',
        },
      ],
      languageOptions: { parserOptions: { ecmaVersion: 2022 } },
    }),
    test({
      code: 'import foo, { foo as bar } from "./export-default-string-and-named"',
      errors: [
        {
          message:
            "Using exported name 'foo' as identifier for default export.",
          type: 'ImportDefaultSpecifier',
        },
      ],
      languageOptions: { parserOptions: { ecmaVersion: 2022 } },
    }),
  ],
})
