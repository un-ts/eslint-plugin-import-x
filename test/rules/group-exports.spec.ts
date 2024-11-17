import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, parsers } from '../utils'

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

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('group-exports', rule, {
  valid: [
    tValid({ code: 'export const test = true' }),
    tValid({
      code: `
      export default {}
      export const test = true
    `,
    }),
    tValid({
      code: `
      const first = true
      const second = true
      export {
        first,
        second
      }
    `,
    }),
    tValid({
      code: `
      export default {}
      /* test */
      export const test = true
    `,
    }),
    tValid({
      code: `
      export default {}
      // test
      export const test = true
    `,
    }),
    tValid({
      code: `
      export const test = true
      /* test */
      export default {}
    `,
    }),
    tValid({
      code: `
      export const test = true
      // test
      export default {}
    `,
    }),
    tValid({
      code: `
      export { default as module1 } from './module-1'
      export { default as module2 } from './module-2'
    `,
    }),
    tValid({ code: 'module.exports = {} ' }),
    tValid({
      code: `
      module.exports = { test: true,
        another: false }
    `,
    }),
    tValid({ code: 'exports.test = true' }),

    tValid({
      code: `
      module.exports = {}
      const test = module.exports
    `,
    }),
    tValid({
      code: `
      exports.test = true
      const test = exports.test
    `,
    }),
    tValid({
      code: `
      module.exports = {}
      module.exports.too.deep = true
    `,
    }),
    tValid({
      code: `
      module.exports.deep.first = true
      module.exports.deep.second = true
    `,
    }),
    tValid({
      code: `
      module.exports = {}
      exports.too.deep = true
    `,
    }),
    tValid({
      code: `
      export default {}
      const test = true
      export { test }
    `,
    }),
    tValid({
      code: `
      const test = true
      export { test }
      const another = true
      export default {}
    `,
    }),
    tValid({
      code: `
      module.something.else = true
      module.something.different = true
    `,
    }),
    tValid({
      code: `
      module.exports.test = true
      module.something.different = true
    `,
    }),
    tValid({
      code: `
      exports.test = true
      module.something.different = true
    `,
    }),
    tValid({
      code: `
      unrelated = 'assignment'
      module.exports.test = true
    `,
    }),
    tValid({
      code: `
      type firstType = {
        propType: string
      };
      const first = {};
      export type { firstType };
      export { first };
    `,
    }),
    tValid({
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
    tValid({
      code: `
      export type { type1A, type1B } from './module-1'
      export { method1 } from './module-1'
    `,
    }),
  ],
  invalid: [
    tInvalid({
      code: `
        export const test = true
        export const another = true
      `,
      errors: [
        { messageId: 'ExportNamedDeclaration' },
        { messageId: 'ExportNamedDeclaration' },
      ],
    }),
    tInvalid({
      code: `
        export { method1 } from './module-1'
        export { method2 } from './module-1'
      `,
      errors: [
        { messageId: 'ExportNamedDeclaration' },
        { messageId: 'ExportNamedDeclaration' },
      ],
    }),
    tInvalid({
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
    tInvalid({
      code: `
        module.exports = {}
        module.exports.test = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    tInvalid({
      code: `
        module.exports = { test: true }
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    tInvalid({
      code: `
        module.exports.test = true
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    tInvalid({
      code: `
        exports.test = true
        module.exports.another = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    tInvalid({
      code: `
        module.exports = () => {}
        module.exports.attached = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    tInvalid({
      code: `
        module.exports = function tInvalid() {}
        module.exports.attached = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    tInvalid({
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
    tInvalid({
      code: `
        module.exports = "non-object"
        module.exports.attached = true
      `,
      errors: [
        { messageId: 'AssignmentExpression' },
        { messageId: 'AssignmentExpression' },
      ],
    }),
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
