import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunction, parsers } from '../utils'

import rule from 'eslint-plugin-import-x/rules/group-exports'

const ruleTester = new TSESLintRuleTester({
  languageOptions: {
    parser: require(parsers.BABEL),
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        configFile: false,
        babelrc: false,
        presets: ['@babel/flow'],
      },
    },
  },
})

const test = createRuleTestCaseFunction<typeof rule>()

ruleTester.run('group-exports', rule, {
  valid: [
    test({ code: 'export const test = true' }),
    test({
      code: `
      export default {}
      export const test = true
    `,
    }),
    test({
      code: `
      const first = true
      const second = true
      export {
        first,
        second
      }
    `,
    }),
    test({
      code: `
      export default {}
      /* test */
      export const test = true
    `,
    }),
    test({
      code: `
      export default {}
      // test
      export const test = true
    `,
    }),
    test({
      code: `
      export const test = true
      /* test */
      export default {}
    `,
    }),
    test({
      code: `
      export const test = true
      // test
      export default {}
    `,
    }),
    test({
      code: `
      export { default as module1 } from './module-1'
      export { default as module2 } from './module-2'
    `,
    }),
    test({ code: 'module.exports = {} ' }),
    test({
      code: `
      module.exports = { test: true,
        another: false }
    `,
    }),
    test({ code: 'exports.test = true' }),

    test({
      code: `
      module.exports = {}
      const test = module.exports
    `,
    }),
    test({
      code: `
      exports.test = true
      const test = exports.test
    `,
    }),
    test({
      code: `
      module.exports = {}
      module.exports.too.deep = true
    `,
    }),
    test({
      code: `
      module.exports.deep.first = true
      module.exports.deep.second = true
    `,
    }),
    test({
      code: `
      module.exports = {}
      exports.too.deep = true
    `,
    }),
    test({
      code: `
      export default {}
      const test = true
      export { test }
    `,
    }),
    test({
      code: `
      const test = true
      export { test }
      const another = true
      export default {}
    `,
    }),
    test({
      code: `
      module.something.else = true
      module.something.different = true
    `,
    }),
    test({
      code: `
      module.exports.test = true
      module.something.different = true
    `,
    }),
    test({
      code: `
      exports.test = true
      module.something.different = true
    `,
    }),
    test({
      code: `
      unrelated = 'assignment'
      module.exports.test = true
    `,
    }),
    test({
      code: `
      type firstType = {
        propType: string
      };
      const first = {};
      export type { firstType };
      export { first };
    `,
    }),
    test({
      code: `
      type firstType = {
        propType: string
      };
      type secondType = {
        propType: string
      };
      export type { firstType, secondType };
    `,
    }),
    test({
      code: `
      export type { type1A, type1B } from './module-1'
      export { method1 } from './module-1'
    `,
    }),
  ],
  invalid: [
    test({
      code: `
        export const test = true
        export const another = true
      `,
      errors: [
        { messageId: 'ExportNamedDeclaration' },
        { messageId: 'ExportNamedDeclaration' },
      ],
    }),
    test({
      code: `
        export { method1 } from './module-1'
        export { method2 } from './module-1'
      `,
      errors: [
        { messageId: 'ExportNamedDeclaration' },
        { messageId: 'ExportNamedDeclaration' },
      ],
    }),
    test({
      code: `
        module.exports = {}
        module.exports.test = true
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports = {}
        module.exports.test = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports = { test: true }
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports.test = true
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        exports.test = true
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports = () => {}
        module.exports.attached = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports = function test() {}
        module.exports.attached = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports = () => {}
        exports.test = true
        exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports = "non-object"
        module.exports.attached = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        module.exports = "non-object"
        module.exports.attached = true
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    test({
      code: `
        type firstType = {
          propType: string
        };
        type secondType = {
          propType: string
        };
        const first = {};
        export type { firstType };
        export type { secondType };
        export { first };
      `,
      errors: [
        { messageId: 'ExportNamedDeclaration' },
        { messageId: 'ExportNamedDeclaration' },
      ],
    }),
    test({
      code: `
        export type { type1 } from './module-1'
        export type { type2 } from './module-1'
      `,
      errors: [
        { messageId: 'ExportNamedDeclaration' },
        { messageId: 'ExportNamedDeclaration' },
      ],
    }),
  ],
})
