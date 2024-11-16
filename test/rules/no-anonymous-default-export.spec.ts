import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import {
  SYNTAX_VALID_CASES,
  parsers,
  createRuleTestCaseFunction,
} from '../utils'
import type { GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-anonymous-default-export'

const ruleTester = new TSESLintRuleTester()

const test = createRuleTestCaseFunction<typeof rule>()

function createAssignError(
  type: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'assign',
    data: { type },
  }
}

ruleTester.run('no-anonymous-default-export', rule, {
  valid: [
    // Exports with identifiers are valid
    test({ code: 'const foo = 123\nexport default foo' }),
    test({ code: 'export default function foo() {}' }),
    test({ code: 'export default class MyClass {}' }),

    // Allow each forbidden type with appropriate option
    test({ code: 'export default []', options: [{ allowArray: true }] }),
    test({
      code: 'export default () => {}',
      options: [{ allowArrowFunction: true }],
    }),
    test({
      code: 'export default class {}',
      options: [{ allowAnonymousClass: true }],
    }),
    test({
      code: 'export default function() {}',
      options: [{ allowAnonymousFunction: true }],
    }),
    test({ code: 'export default 123', options: [{ allowLiteral: true }] }),
    test({ code: "export default 'foo'", options: [{ allowLiteral: true }] }),
    test({ code: 'export default `foo`', options: [{ allowLiteral: true }] }),
    test({ code: 'export default {}', options: [{ allowObject: true }] }),
    test({
      code: 'export default foo(bar)',
      options: [{ allowCallExpression: true }],
    }),
    test({ code: 'export default new Foo()', options: [{ allowNew: true }] }),

    // Allow forbidden types with multiple options
    test({
      code: 'export default 123',
      options: [{ allowLiteral: true, allowObject: true }],
    }),
    test({
      code: 'export default {}',
      options: [{ allowLiteral: true, allowObject: true }],
    }),

    // Sanity check unrelated export syntaxes
    test({ code: "export * from 'foo'" }),
    test({ code: 'const foo = 123\nexport { foo }' }),
    test({ code: 'const foo = 123\nexport { foo as default }' }),
    test({
      code: 'const foo = 123\nexport { foo as "default" }',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),

    // Allow call expressions by default for backwards compatibility
    test({ code: 'export default foo(bar)' }),

    ...SYNTAX_VALID_CASES,
  ],

  invalid: [
    test({
      code: 'export default []',
      errors: [createAssignError('array')],
    }),
    test({
      code: 'export default () => {}',
      errors: [createAssignError('arrow function')],
    }),
    test({
      code: 'export default class {}',
      errors: [{ messageId: 'anonymous', data: { type: 'class' } }],
    }),
    test({
      code: 'export default function() {}',
      errors: [{ messageId: 'anonymous', data: { type: 'function' } }],
    }),
    test({
      code: 'export default 123',
      errors: [createAssignError('literal')],
    }),
    test({
      code: "export default 'foo'",
      errors: [createAssignError('literal')],
    }),
    test({
      code: 'export default `foo`',
      errors: [createAssignError('literal')],
    }),
    test({
      code: 'export default {}',
      errors: [createAssignError('object')],
    }),
    test({
      code: 'export default foo(bar)',
      options: [{ allowCallExpression: false }],
      errors: [createAssignError('call result')],
    }),
    test({
      code: 'export default new Foo()',
      errors: [createAssignError('instance')],
    }),

    // Test failure with non-covering exception
    test({
      code: 'export default 123',
      options: [{ allowObject: true }],
      errors: [createAssignError('literal')],
    }),
  ],
})
