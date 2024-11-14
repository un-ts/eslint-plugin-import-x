import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { TSESTree } from '@typescript-eslint/utils'

import { createRuleTestCaseFunction } from '../utils'
import type { GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/exports-last'

const ruleTester = new TSESLintRuleTester()

const test = createRuleTestCaseFunction<typeof rule>()

function createInvalidCaseError(
  type: `${TSESTree.AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'end',
    type: type as TSESTree.AST_NODE_TYPES,
  }
}

ruleTester.run('exports-last', rule, {
  valid: [
    // Empty file
    test({
      code: '// comment',
    }),
    test({
      // No exports
      code: `
        const foo = 'bar'
        const bar = 'baz'
      `,
    }),
    test({
      code: `
        const foo = 'bar'
        export {foo}
      `,
    }),
    test({
      code: `
        const foo = 'bar'
        export default foo
      `,
    }),
    // Only exports
    test({
      code: `
        export default foo
        export const bar = true
      `,
    }),
    test({
      code: `
        const foo = 'bar'
        export default foo
        export const bar = true
      `,
    }),
    // Multiline export
    test({
      code: `
        const foo = 'bar'
        export default function bar () {
          const very = 'multiline'
        }
        export const baz = true
      `,
    }),
    // Many exports
    test({
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
    test({
      code: `
        export * from './foo'
      `,
    }),
  ],
  invalid: [
    // Default export before variable declaration
    test({
      code: `
        export default 'bar'
        const bar = true
      `,
      errors: [createInvalidCaseError('ExportDefaultDeclaration')],
    }),
    // Named export before variable declaration
    test({
      code: `
        export const foo = 'bar'
        const bar = true
      `,
      errors: [createInvalidCaseError('ExportNamedDeclaration')],
    }),
    // Export all before variable declaration
    test({
      code: `
        export * from './foo'
        const bar = true
      `,
      errors: [createInvalidCaseError('ExportAllDeclaration')],
    }),
    // Many exports around variable declaration
    test({
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
