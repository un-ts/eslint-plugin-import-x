import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { parsers, createRuleTestCaseFunctions, testFilePath } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/no-relative-parent-imports'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>({
  filename: testFilePath('./internal-modules/plugins/plugin2/index.js'),
  languageOptions: { parser: cjsRequire(parsers.BABEL) },
})

function createNoAllowedError(
  filename: string,
  depPath: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'noAllowed', data: { filename, depPath } }
}

ruleTester.run('no-relative-parent-imports', rule, {
  valid: [
    tValid({
      code: 'import foo from "./internal.js"',
    }),
    tValid({
      code: 'import foo from "./app/index.js"',
    }),
    tValid({
      code: 'import foo from "package"',
    }),
    tValid({
      code: 'require("./internal.js")',
      options: [{ commonjs: true }],
    }),
    tValid({
      code: 'require("./app/index.js")',
      options: [{ commonjs: true }],
    }),
    tValid({
      code: 'require("package")',
      options: [{ commonjs: true }],
    }),
    tValid({
      code: 'import("./internal.js")',
    }),
    tValid({
      code: 'import("./app/index.js")',
    }),
    tValid({
      code: 'import(".")',
    }),
    tValid({
      code: 'import("path")',
    }),
    tValid({
      code: 'import("package")',
    }),
    tValid({
      code: 'import("@scope/package")',
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import foo from "../plugin.js"',
      errors: [
        {
          ...createNoAllowedError('index.js', '../plugin.js'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'require("../plugin.js")',
      options: [{ commonjs: true }],
      errors: [
        {
          ...createNoAllowedError('index.js', '../plugin.js'),
          line: 1,
          column: 9,
        },
      ],
    }),
    tInvalid({
      code: 'import("../plugin.js")',
      errors: [
        {
          ...createNoAllowedError('index.js', '../plugin.js'),
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'import foo from "./../plugin.js"',
      errors: [
        {
          ...createNoAllowedError('index.js', './../plugin.js'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'import foo from "../../api/service"',
      errors: [
        {
          ...createNoAllowedError('index.js', '../../api/service'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'import("../../api/service")',
      errors: [
        {
          ...createNoAllowedError('index.js', '../../api/service'),
          line: 1,
          column: 8,
        },
      ],
    }),
  ],
})
