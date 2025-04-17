import { RuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/avoid-namespace-import'

const ruleTester = new RuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('avoid-namespace-import', rule, {
  valid: [
    tValid({ code: 'import { foo } from "foo";' }),
    // 'import type { foo } from "foo";',
    // 'import type * as foo from "foo";'
    tValid({
      code: 'import * as foo from "foo";',
      options: [
        {
          allowList: ['foo'],
        },
      ],
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import * as foo from "foo";',
      errors: [{ messageId: 'avoidNamespace' }],
    }),
    tInvalid({
      code: 'import * as bar from "bar";',
      errors: [{ messageId: 'avoidNamespace' }],
      options: [
        {
          allowList: ['foo'],
        },
      ],
    }),
  ],
})
