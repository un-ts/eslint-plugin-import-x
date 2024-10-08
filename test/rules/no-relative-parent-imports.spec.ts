import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, test as _test, testFilePath } from '../utils'
import type { ValidTestCase } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-relative-parent-imports'

const test = <T extends ValidTestCase>(def: T) =>
  _test({
    ...def,
    filename: testFilePath('./internal-modules/plugins/plugin2/index.js'),
    languageOptions: { parser: require(parsers.BABEL) },
  })

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-relative-parent-imports', rule, {
  valid: [
    test({
      code: 'import foo from "./internal.js"',
    }),
    test({
      code: 'import foo from "./app/index.js"',
    }),
    test({
      code: 'import foo from "package"',
    }),
    test({
      code: 'require("./internal.js")',
      options: [{ commonjs: true }],
    }),
    test({
      code: 'require("./app/index.js")',
      options: [{ commonjs: true }],
    }),
    test({
      code: 'require("package")',
      options: [{ commonjs: true }],
    }),
    test({
      code: 'import("./internal.js")',
    }),
    test({
      code: 'import("./app/index.js")',
    }),
    test({
      code: 'import(".")',
    }),
    test({
      code: 'import("path")',
    }),
    test({
      code: 'import("package")',
    }),
    test({
      code: 'import("@scope/package")',
    }),
  ],

  invalid: [
    test({
      code: 'import foo from "../plugin.js"',
      errors: [
        {
          message:
            "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `index.js` to same directory as `../plugin.js` or consider making `../plugin.js` a package.",
          line: 1,
          column: 17,
        },
      ],
    }),
    test({
      code: 'require("../plugin.js")',
      options: [{ commonjs: true }],
      errors: [
        {
          message:
            "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `index.js` to same directory as `../plugin.js` or consider making `../plugin.js` a package.",
          line: 1,
          column: 9,
        },
      ],
    }),
    test({
      code: 'import("../plugin.js")',
      errors: [
        {
          message:
            "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `index.js` to same directory as `../plugin.js` or consider making `../plugin.js` a package.",
          line: 1,
          column: 8,
        },
      ],
    }),
    test({
      code: 'import foo from "./../plugin.js"',
      errors: [
        {
          message:
            "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `index.js` to same directory as `./../plugin.js` or consider making `./../plugin.js` a package.",
          line: 1,
          column: 17,
        },
      ],
    }),
    test({
      code: 'import foo from "../../api/service"',
      errors: [
        {
          message:
            "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `index.js` to same directory as `../../api/service` or consider making `../../api/service` a package.",
          line: 1,
          column: 17,
        },
      ],
    }),
    test({
      code: 'import("../../api/service")',
      errors: [
        {
          message:
            "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `index.js` to same directory as `../../api/service` or consider making `../../api/service` a package.",
          line: 1,
          column: 8,
        },
      ],
    }),
  ],
})
