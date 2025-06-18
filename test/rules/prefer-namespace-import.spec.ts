import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/prefer-namespace-import'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('prefer-namespace-import', rule, {
  valid: [
    tValid({
      code: `import * as Name from '@scope/name';`,
    }),
    tValid({
      code: `import * as Name from 'prefix-name';`,
    }),
    tValid({
      code: `
          import * as Name1 from '@scope/name';
          import * as Name2 from 'prefix-name';
          `,
    }),
    tValid({
      code: `import Name from 'other-name';`,
      options: [
        {
          patterns: ['/^@scope/', '/^prefix-/'],
        },
      ],
    }),
  ],
  invalid: [
    tInvalid({
      code: `
import Name1 from '@scope/name';
import Name2 from 'prefix-name';
import Name3, { named } from 'prefix-name';
import Name4 from 'other-name';
          `,
      errors: [
        {
          messageId: 'preferNamespaceImport',
          data: { source: '@scope/name', specifier: 'Name1' },
        },
        {
          messageId: 'preferNamespaceImport',
          data: { source: 'prefix-name', specifier: 'Name2' },
        },
        {
          messageId: 'preferNamespaceImport',
          data: { source: 'prefix-name', specifier: 'Name3' },
        },
      ],
      options: [
        {
          patterns: ['/^@scope/', '/^prefix-/'],
        },
      ],
      output: `
import * as Name1 from '@scope/name';
import * as Name2 from 'prefix-name';
import * as Name3 from 'prefix-name';
import { named } from 'prefix-name';
import Name4 from 'other-name';
          `,
    }),
  ],
})
