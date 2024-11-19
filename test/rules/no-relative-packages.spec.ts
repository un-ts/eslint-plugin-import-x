import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils'
import type { GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-relative-packages'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createNotFoundError(
  importPath: string,
  properImport: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'noAllowed',
    data: { properImport, importPath },
  }
}

ruleTester.run('no-relative-packages', rule, {
  valid: [
    tValid({
      code: 'import foo from "./index.js"',
      filename: testFilePath('./package/index.js'),
    }),
    tValid({
      code: 'import bar from "../bar"',
      filename: testFilePath('./package/index.js'),
    }),
    tValid({
      code: 'import {foo} from "a"',
      filename: testFilePath('./package-named/index.js'),
    }),
    tValid({
      code: 'const bar = require("../bar.js")',
      filename: testFilePath('./package/index.js'),
    }),
    tValid({
      code: 'const bar = require("../not/a/file/path.js")',
      filename: testFilePath('./package/index.js'),
    }),
    tValid({
      code: 'import "package"',
      filename: testFilePath('./package/index.js'),
    }),
    tValid({
      code: 'require("../bar.js")',
      filename: testFilePath('./package/index.js'),
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import foo from "./package-named"',
      filename: testFilePath('./bar.js'),
      errors: [
        {
          ...createNotFoundError('./package-named', 'package-named'),
          line: 1,
          column: 17,
        },
      ],
      output: 'import foo from "package-named"',
    }),
    tInvalid({
      code: 'import foo from "../package-named"',
      filename: testFilePath('./package/index.js'),
      errors: [
        {
          ...createNotFoundError('../package-named', 'package-named'),
          line: 1,
          column: 17,
        },
      ],
      output: 'import foo from "package-named"',
    }),
    tInvalid({
      code: 'import foo from "../package-scoped"',
      filename: testFilePath('./package/index.js'),
      errors: [
        {
          ...createNotFoundError(
            '../package-scoped',
            path.normalize('@scope/package-named'),
          ),
          line: 1,
          column: 17,
        },
      ],
      output: `import foo from "@scope/package-named"`,
    }),
    tInvalid({
      code: 'import bar from "../bar"',
      filename: testFilePath('./package-named/index.js'),
      errors: [
        {
          ...createNotFoundError(
            '../bar',
            path.normalize('eslint-plugin-import-x/test/fixtures/bar'),
          ),
          line: 1,
          column: 17,
        },
      ],
      output: `import bar from "eslint-plugin-import-x/test/fixtures/bar"`,
    }),
  ],
})
