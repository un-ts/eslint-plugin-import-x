import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { parsers, createRuleTestCaseFunctions, testFilePath } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
import { createNodeResolver } from 'eslint-plugin-import-x/node-resolver'
import rule from 'eslint-plugin-import-x/rules/no-relative-parent-imports'

const ruleTester = new TSESLintRuleTester()

const subpathImportSettings = {
  'import-x/resolver-next': [
    createNodeResolver({
      alias: {
        '#plugin': [testFilePath('./internal-modules/plugins/plugin.js')],
      },
    }),
  ],
}

const privateImportsFile = testFilePath('./private-imports/nested/a.js')

const privateImportsSettings = {
  'import-x/resolver-next': [createNodeResolver()],
}

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
    tValid({
      code: 'import foo from "../plugin.js"',
      options: [{ maxLevels: 1 }],
    }),
    tValid({
      code: 'require("../plugin.js")',
      options: [{ commonjs: true, maxLevels: 1 }],
    }),
    tValid({
      code: 'import foo from "../../api/service"',
      options: [{ maxLevels: 2 }],
    }),
    tValid({
      code: 'import foo from "#plugin"',
      options: [{ ignore: ['^#'] }],
      settings: subpathImportSettings,
    }),
    tValid({
      code: 'import main from "#root/main.js"',
      filename: privateImportsFile,
      options: [{ ignorePrivateImports: true }],
      settings: privateImportsSettings,
    }),
    tValid({
      code: 'import main from "#main"',
      filename: privateImportsFile,
      options: [{ ignorePrivateImports: true }],
      settings: privateImportsSettings,
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import foo from "#plugin"',
      settings: subpathImportSettings,
      errors: [createNoAllowedError('index.js', '#plugin')],
    }),
    tInvalid({
      code: 'import main from "#root/main.js"',
      filename: privateImportsFile,
      settings: privateImportsSettings,
      errors: [createNoAllowedError('a.js', '#root/main.js')],
    }),
    tInvalid({
      code: 'import main from "../main.js"',
      filename: privateImportsFile,
      options: [{ ignorePrivateImports: true }],
      settings: privateImportsSettings,
      errors: [createNoAllowedError('a.js', '../main.js')],
    }),
    tInvalid({
      code: 'import foo from "#plugin"',
      options: [{ ignorePrivateImports: true }],
      settings: subpathImportSettings,
      errors: [createNoAllowedError('index.js', '#plugin')],
    }),
    tInvalid({
      code: 'import foo from "../plugin.js"',
      options: [{ ignore: ['^#'] }],
      settings: subpathImportSettings,
      errors: [createNoAllowedError('index.js', '../plugin.js')],
    }),
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
    tInvalid({
      code: 'import foo from "../../api/service"',
      options: [{ maxLevels: 1 }],
      errors: [createNoAllowedError('index.js', '../../api/service')],
    }),
  ],
})
