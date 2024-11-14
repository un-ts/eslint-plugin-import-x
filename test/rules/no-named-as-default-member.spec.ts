import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { test, SYNTAX_VALID_CASES, parsers } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-named-as-default-member'

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-named-as-default-member', rule, {
  valid: [
    test({ code: 'import bar, {foo} from "./bar";' }),
    test({ code: 'import bar from "./bar"; const baz = bar.baz' }),
    test({ code: 'import {foo} from "./bar"; const baz = foo.baz;' }),
    test({
      code: 'import * as named from "./named-exports"; const a = named.a',
    }),
    test({
      code: 'import foo from "./default-export-default-property"; const a = foo.default',
    }),
    test({
      code: 'import bar, { foo } from "./export-default-string-and-named"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),

    ...SYNTAX_VALID_CASES,
  ],

  invalid: [
    test({
      code: 'import bar from "./bar"; const foo = bar.foo;',
      errors: [
        {
          message:
            "Caution: `bar` also has a named export `foo`. Check if you meant to write `import {foo} from './bar'` instead.",
          type: 'MemberExpression',
        },
      ],
    }),
    test({
      code: 'import bar from "./bar"; bar.foo();',
      errors: [
        {
          message:
            "Caution: `bar` also has a named export `foo`. Check if you meant to write `import {foo} from './bar'` instead.",
          type: 'MemberExpression',
        },
      ],
    }),
    test({
      code: 'import bar from "./bar"; const {foo} = bar;',
      errors: [
        {
          message:
            "Caution: `bar` also has a named export `foo`. Check if you meant to write `import {foo} from './bar'` instead.",
          type: 'Identifier',
        },
      ],
    }),
    test({
      code: 'import bar from "./bar"; const {foo: foo2, baz} = bar;',
      errors: [
        {
          message:
            "Caution: `bar` also has a named export `foo`. Check if you meant to write `import {foo} from './bar'` instead.",
          type: 'Identifier',
        },
      ],
    }),
    test({
      code: 'import bar from "./export-default-string-and-named"; const foo = bar.foo;',
      errors: [
        {
          message:
            "Caution: `bar` also has a named export `foo`. Check if you meant to write `import {foo} from './export-default-string-and-named'` instead.",
          type: 'MemberExpression',
        },
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
})
