import { RuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/avoid-re-export-all'

const ruleTester = new RuleTester()

const { tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('avoid-re-export-all', rule, {
  valid: [
    // 'export type { foo } from "foo";',
    // 'export type * as foo from "foo";',
    'export { foo } from "foo";',
    'export { foo as bar } from "foo";',
  ],

  invalid: [
    tInvalid({
      code: 'export * from "foo";',
      errors: [{ messageId: 'avoidReExport' }],
    }),
    tInvalid({
      code: 'export * as foo from "foo";',
      errors: [{ messageId: 'avoidReExport' }],
    }),
  ],
})
