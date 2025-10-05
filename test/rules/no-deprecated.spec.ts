import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { AST_NODE_TYPES } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  SYNTAX_VALID_CASES,
  parsers,
} from '../utils.js'
import type { GetRuleModuleMessageIds, RuleRunTests } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-deprecated'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createDeprecatedDescError(
  description: string,
  type?: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'deprecatedDesc',
    data: { description },
    type: type as AST_NODE_TYPES,
  }
}

ruleTester.run('no-deprecated', rule, {
  valid: [
    tValid({ code: "import { x } from './fake' " }),
    tValid({ code: "import bar from './bar'" }),

    tValid({ code: "import { fine } from './deprecated'" }),
    tValid({ code: "import { _undocumented } from './deprecated'" }),

    tValid({
      code: "import { fn } from './deprecated'",
      settings: { 'import-x/docstyle': ['tomdoc'] },
    }),

    tValid({
      code: "import { fine } from './tomdoc-deprecated'",
      settings: { 'import-x/docstyle': ['tomdoc'] },
    }),
    tValid({
      code: "import { _undocumented } from './tomdoc-deprecated'",
      settings: { 'import-x/docstyle': ['tomdoc'] },
    }),

    // naked namespace is fine
    tValid({ code: "import * as depd from './deprecated'" }),
    tValid({
      code: "import * as depd from './deprecated'; console.log(depd.fine())",
    }),
    tValid({ code: "import { deepDep } from './deep-deprecated'" }),
    tValid({
      code: "import { deepDep } from './deep-deprecated'; console.log(deepDep.fine())",
    }),

    // redefined
    tValid({
      code: "import { deepDep } from './deep-deprecated'; function x(deepDep) { console.log(deepDep.MY_TERRIBLE_ACTION) }",
    }),

    ...(SYNTAX_VALID_CASES as RuleRunTests<typeof rule>['valid']),
  ],
  invalid: [
    // reports on parse errors even without specifiers
    tInvalid({
      code: "import './malformed.js'",
      // @ts-expect-error parsing error
      errors: 1,
    }),

    tInvalid({
      code: "import { _deprecatedNoDescription } from './deprecated'",
      errors: [{ messageId: 'deprecated' }],
    }),

    tInvalid({
      code: "import { fn } from './deprecated'",
      errors: [createDeprecatedDescError("Please use 'x' instead.")],
    }),

    tInvalid({
      code: "import TerribleClass from './deprecated'",
      errors: [createDeprecatedDescError('This is awful, use NotAsBadClass.')],
    }),

    tInvalid({
      code: "import { MY_TERRIBLE_ACTION } from './deprecated'",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
        ),
      ],
    }),

    tInvalid({
      code: "import { fn } from './deprecated'",
      settings: { 'import-x/docstyle': ['jsdoc', 'tomdoc'] },
      errors: [createDeprecatedDescError("Please use 'x' instead.")],
    }),

    tInvalid({
      code: "import { fn } from './tomdoc-deprecated'",
      settings: { 'import-x/docstyle': ['tomdoc'] },
      errors: [createDeprecatedDescError('This function is terrible.')],
    }),

    tInvalid({
      code: "import TerribleClass from './tomdoc-deprecated'",
      settings: { 'import-x/docstyle': ['tomdoc'] },
      errors: [createDeprecatedDescError('this is awful, use NotAsBadClass.')],
    }),

    tInvalid({
      code: "import { MY_TERRIBLE_ACTION } from './tomdoc-deprecated'",
      settings: { 'import-x/docstyle': ['tomdoc'] },
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
        ),
      ],
    }),

    // ignore redeclares
    tInvalid({
      code: "import { MY_TERRIBLE_ACTION } from './deprecated'; function shadow(MY_TERRIBLE_ACTION) { console.log(MY_TERRIBLE_ACTION); }",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
        ),
      ],
    }),

    // ignore non-deprecateds
    tInvalid({
      code: "import { MY_TERRIBLE_ACTION, fine } from './deprecated'; console.log(fine)",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
        ),
      ],
    }),

    // reflag on subsequent usages
    tInvalid({
      code: "import { MY_TERRIBLE_ACTION } from './deprecated'; console.log(MY_TERRIBLE_ACTION)",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'ImportSpecifier',
        ),

        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
      ],
    }),

    // don't flag other members
    tInvalid({
      code: "import { MY_TERRIBLE_ACTION } from './deprecated'; console.log(someOther.MY_TERRIBLE_ACTION)",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'ImportSpecifier',
        ),
      ],
    }),

    // flag it even with members
    tInvalid({
      code: "import { MY_TERRIBLE_ACTION } from './deprecated'; console.log(MY_TERRIBLE_ACTION.whatever())",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'ImportSpecifier',
        ),

        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
      ],
    }),

    // works for function calls too
    tInvalid({
      code: "import { MY_TERRIBLE_ACTION } from './deprecated'; console.log(MY_TERRIBLE_ACTION(this, is, the, worst))",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'ImportSpecifier',
        ),

        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
      ],
    }),

    // deprecated full module
    tInvalid({
      code: "import Thing from './deprecated-file'",
      errors: [
        createDeprecatedDescError(
          'This module is the worst.',
          'ImportDeclaration',
        ),
      ],
    }),

    // don't flag as part of other member expressions
    tInvalid({
      code: "import Thing from './deprecated-file'; console.log(other.Thing)",
      errors: [
        createDeprecatedDescError(
          'This module is the worst.',
          'ImportDeclaration',
        ),
      ],
    }),

    // namespace following
    tInvalid({
      code: "import * as depd from './deprecated'; console.log(depd.MY_TERRIBLE_ACTION)",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
      ],
    }),
    tInvalid({
      code: "import * as deep from './deep-deprecated'; console.log(deep.deepDep.MY_TERRIBLE_ACTION)",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
      ],
    }),
    tInvalid({
      code: "import { deepDep } from './deep-deprecated'; console.log(deepDep.MY_TERRIBLE_ACTION)",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
      ],
    }),
    tInvalid({
      code: "import { deepDep } from './deep-deprecated'; function x(deepNDep) { console.log(deepDep.MY_TERRIBLE_ACTION) }",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
      ],
    }),
  ],
})

ruleTester.run('no-deprecated: hoisting', rule, {
  valid: [
    tValid({
      code: "function x(deepDep) { console.log(deepDep.MY_TERRIBLE_ACTION) } import { deepDep } from './deep-deprecated'",
    }),
  ],

  invalid: [
    tInvalid({
      code: "console.log(MY_TERRIBLE_ACTION); import { MY_TERRIBLE_ACTION } from './deprecated'",
      errors: [
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'Identifier',
        ),
        createDeprecatedDescError(
          'Please stop sending/handling this action type.',
          'ImportSpecifier',
        ),
      ],
    }),
  ],
})

describe('TypeScript', () => {
  const parserConfig = {
    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }

  ruleTester.run('no-deprecated', rule, {
    valid: [
      tValid({
        code: "import * as hasDeprecated from './ts-deprecated.ts'",
        ...parserConfig,
      }),
    ],
    invalid: [
      tInvalid({
        code: "import { foo } from './ts-deprecated.ts'; console.log(foo())",
        errors: [
          createDeprecatedDescError("Don't use this!", 'ImportSpecifier'),
          createDeprecatedDescError("Don't use this!", 'Identifier'),
        ],
        ...parserConfig,
      }),
    ],
  })
})
