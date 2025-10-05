import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { AST_NODE_TYPES } from '@typescript-eslint/utils'

import { createRuleTestCaseFunctions } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/exports-last'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createInvalidCaseError(
  type: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'end', type: type as AST_NODE_TYPES }
}

ruleTester.run('exports-last', rule, {
  valid: [
    // Empty file
    tValid({
      code: '// comment',
    }),
    tValid({
      // No exports
      code: `
        const foo = 'bar'
        const bar = 'baz'
      `,
    }),
    tValid({
      code: `
        const foo = 'bar'
        export {foo}
      `,
    }),
    tValid({
      code: `
        const foo = 'bar'
        export default foo
      `,
    }),
    // Only exports
    tValid({
      code: `
        export default foo
        export const bar = true
      `,
    }),
    tValid({
      code: `
        const foo = 'bar'
        export default foo
        export const bar = true
      `,
    }),
    // Multiline export
    tValid({
      code: `
        const foo = 'bar'
        export default function bar () {
          const very = 'multiline'
        }
        export const baz = true
      `,
    }),
    // Many exports
    tValid({
      code: `
        const foo = 'bar'
        export default foo
        export const so = 'many'
        export const exports = ':)'
        export const i = 'cant'
        export const even = 'count'
        export const how = 'many'
      `,
    }),
    // Export all
    tValid({
      code: `
        export * from './foo'
      `,
    }),
  ],
  invalid: [
    // Default export before variable declaration
    tInvalid({
      code: `
        export default 'bar'
        const bar = true
      `,
      errors: [createInvalidCaseError('ExportDefaultDeclaration')],
    }),
    // Named export before variable declaration
    tInvalid({
      code: `
        export const foo = 'bar'
        const bar = true
      `,
      errors: [createInvalidCaseError('ExportNamedDeclaration')],
    }),
    // Export all before variable declaration
    tInvalid({
      code: `
        export * from './foo'
        const bar = true
      `,
      errors: [createInvalidCaseError('ExportAllDeclaration')],
    }),
    // Many exports around variable declaration
    tInvalid({
      code: `
        export default 'such foo many bar'
        export const so = 'many'
        const foo = 'bar'
        export const exports = ':)'
        export const i = 'cant'
        export const even = 'count'
        export const how = 'many'
      `,
      errors: [
        createInvalidCaseError('ExportDefaultDeclaration'),
        createInvalidCaseError('ExportNamedDeclaration'),
      ],
    }),
  ],
})
