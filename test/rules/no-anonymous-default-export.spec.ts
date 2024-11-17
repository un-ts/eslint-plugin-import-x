import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import {
  SYNTAX_VALID_CASES,
  parsers,
  createRuleTestCaseFunctions,
} from '../utils'
import type { GetRuleModuleMessageIds, RunTests } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-anonymous-default-export'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

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
    tValid({ code: 'const foo = 123\nexport default foo' }),
    tValid({ code: 'export default function foo() {}' }),
    tValid({ code: 'export default class MyClass {}' }),

    // Allow each forbidden type with appropriate option
    tValid({ code: 'export default []', options: [{ allowArray: true }] }),
    tValid({
      code: 'export default () => {}',
      options: [{ allowArrowFunction: true }],
    }),
    tValid({
      code: 'export default class {}',
      options: [{ allowAnonymousClass: true }],
    }),
    tValid({
      code: 'export default function() {}',
      options: [{ allowAnonymousFunction: true }],
    }),
    tValid({ code: 'export default 123', options: [{ allowLiteral: true }] }),
    tValid({ code: "export default 'foo'", options: [{ allowLiteral: true }] }),
    tValid({ code: 'export default `foo`', options: [{ allowLiteral: true }] }),
    tValid({ code: 'export default {}', options: [{ allowObject: true }] }),
    tValid({
      code: 'export default foo(bar)',
      options: [{ allowCallExpression: true }],
    }),
    tValid({ code: 'export default new Foo()', options: [{ allowNew: true }] }),

    // Allow forbidden types with multiple options
    tValid({
      code: 'export default 123',
      options: [{ allowLiteral: true, allowObject: true }],
    }),
    tValid({
      code: 'export default {}',
      options: [{ allowLiteral: true, allowObject: true }],
    }),

    // Sanity check unrelated export syntaxes
    tValid({ code: "export * from 'foo'" }),
    tValid({ code: 'const foo = 123\nexport { foo }' }),
    tValid({ code: 'const foo = 123\nexport { foo as default }' }),
    tValid({
      code: 'const foo = 123\nexport { foo as "default" }',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),

    // Allow call expressions by default for backwards compatibility
    tValid({ code: 'export default foo(bar)' }),

    ...(SYNTAX_VALID_CASES as RunTests<typeof rule>['valid']),
  ],

  invalid: [
    tInvalid({
      code: 'export default []',
      errors: [createAssignError('array')],
    }),
    tInvalid({
      code: 'export default () => {}',
      errors: [createAssignError('arrow function')],
    }),
    tInvalid({
      code: 'export default class {}',
      errors: [{ messageId: 'anonymous', data: { type: 'class' } }],
    }),
    tInvalid({
      code: 'export default function() {}',
      errors: [{ messageId: 'anonymous', data: { type: 'function' } }],
    }),
    tInvalid({
      code: 'export default 123',
      errors: [createAssignError('literal')],
    }),
    tInvalid({
      code: "export default 'foo'",
      errors: [createAssignError('literal')],
    }),
    tInvalid({
      code: 'export default `foo`',
      errors: [createAssignError('literal')],
    }),
    tInvalid({
      code: 'export default {}',
      errors: [createAssignError('object')],
    }),
    tInvalid({
      code: 'export default foo(bar)',
      options: [{ allowCallExpression: false }],
      errors: [createAssignError('call result')],
    }),
    tInvalid({
      code: 'export default new Foo()',
      errors: [createAssignError('instance')],
    }),

    // Test failure with non-covering exception
    tInvalid({
      code: 'export default 123',
      options: [{ allowObject: true }],
      errors: [createAssignError('literal')],
    }),
  ],
})
