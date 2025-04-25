import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { AST_NODE_TYPES } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  SYNTAX_VALID_CASES,
  parsers,
} from '../utils.js'
import type { GetRuleModuleMessageIds, RuleRunTests } from '../utils.js'

import { cjsRequire as require } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/no-named-as-default-member'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createMemberError(
  data: { objectName: string; propName: string; sourcePath: string },
  type: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'member', data, type: type as AST_NODE_TYPES }
}

ruleTester.run('no-named-as-default-member', rule, {
  valid: [
    tValid({ code: 'import bar, {foo} from "./bar";' }),
    tValid({ code: 'import bar from "./bar"; const baz = bar.baz' }),
    tValid({ code: 'import {foo} from "./bar"; const baz = foo.baz;' }),
    tValid({
      code: 'import * as named from "./named-exports"; const a = named.a',
    }),
    tValid({
      code: 'import foo from "./default-export-default-property"; const a = foo.default',
    }),
    tValid({
      code: 'import bar, { foo } from "./export-default-string-and-named"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),

    ...(SYNTAX_VALID_CASES as RuleRunTests<typeof rule>['valid']),
  ],

  invalid: [
    tInvalid({
      code: 'import bar from "./bar"; const foo = bar.foo;',
      errors: [
        createMemberError(
          { objectName: 'bar', propName: 'foo', sourcePath: './bar' },
          'MemberExpression',
        ),
      ],
    }),
    tInvalid({
      code: 'import bar from "./bar"; bar.foo();',
      errors: [
        createMemberError(
          { objectName: 'bar', propName: 'foo', sourcePath: './bar' },
          'MemberExpression',
        ),
      ],
    }),
    tInvalid({
      code: 'import bar from "./bar"; const {foo} = bar;',
      errors: [
        createMemberError(
          { objectName: 'bar', propName: 'foo', sourcePath: './bar' },
          'Identifier',
        ),
      ],
    }),
    tInvalid({
      code: 'import bar from "./bar"; const {foo: foo2, baz} = bar;',
      errors: [
        createMemberError(
          { objectName: 'bar', propName: 'foo', sourcePath: './bar' },
          'Identifier',
        ),
      ],
    }),
    tInvalid({
      code: 'import bar from "./export-default-string-and-named"; const foo = bar.foo;',
      errors: [
        createMemberError(
          {
            objectName: 'bar',
            propName: 'foo',
            sourcePath: './export-default-string-and-named',
          },
          'MemberExpression',
        ),
      ],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
  ],
})
