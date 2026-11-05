import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import { createNodeResolver } from 'eslint-plugin-import-x/node-resolver'
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

// A workspace that reaches its packages through symlinks, as pnpm and yarn
// workspaces do. The resolver follows the symlinks, so the resolved file is
// not below the path written in the import.
const symlinkRoot = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'no-relative-packages-')),
)

function symlinkFixture(relativePath = '') {
  return path.join(symlinkRoot, relativePath)
}

for (const [file, content] of [
  ['repo/packages/foo/package.json', '{ "name": "foo" }'],
  ['repo/packages/foo/index.js', ''],
  ['store/shared/package.json', '{ "name": "shared" }'],
  ['store/shared/lib/util.js', ''],
  ['store/bootstrap/package.json', '{ "name": "bootstrap" }'],
  ['store/bootstrap/dist/css/bootstrap.css', ''],
]) {
  fs.mkdirSync(path.dirname(symlinkFixture(file)), { recursive: true })
  fs.writeFileSync(symlinkFixture(file), content)
}
fs.mkdirSync(symlinkFixture('repo/packages/foo/node_modules'))
fs.symlinkSync(
  symlinkFixture('store/shared'),
  symlinkFixture('repo/packages/shared'),
  'junction',
)
fs.symlinkSync(
  symlinkFixture('store/bootstrap'),
  symlinkFixture('repo/packages/foo/node_modules/bootstrap'),
  'junction',
)

afterAll(() => {
  fs.rmSync(symlinkRoot, { recursive: true, force: true })
})

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
      code: 'import foo from "../package-named/package-named"',
      filename: testFilePath('./package/index.js'),
      errors: [
        {
          ...createNotFoundError(
            '../package-named/package-named',
            path.normalize('package-named/package-named'),
          ),
          line: 1,
          column: 17,
        },
      ],
      output: 'import foo from "package-named/package-named"',
    }),
    tInvalid({
      code: 'import foo from "../package-named/sub"',
      filename: testFilePath('./package/index.js'),
      errors: [
        {
          ...createNotFoundError(
            '../package-named/sub',
            path.normalize('package-named/sub'),
          ),
          line: 1,
          column: 17,
        },
      ],
      output: 'import foo from "package-named/sub"',
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
    tInvalid({
      code: 'import util from "../shared/lib/util"',
      filename: symlinkFixture('repo/packages/foo/index.js'),
      settings: { 'import-x/resolver-next': [createNodeResolver()] },
      errors: [
        {
          ...createNotFoundError(
            '../shared/lib/util',
            path.normalize('shared/lib/util'),
          ),
          line: 1,
          column: 18,
        },
      ],
      output: 'import util from "shared/lib/util"',
    }),
    tInvalid({
      code: 'import "./node_modules/bootstrap/dist/css/bootstrap.css"',
      filename: symlinkFixture('repo/packages/foo/index.js'),
      settings: { 'import-x/resolver-next': [createNodeResolver()] },
      errors: [
        {
          ...createNotFoundError(
            './node_modules/bootstrap/dist/css/bootstrap.css',
            path.normalize('bootstrap/dist/css/bootstrap.css'),
          ),
          line: 1,
          column: 8,
        },
      ],
      output: 'import "bootstrap/dist/css/bootstrap.css"',
    }),
  ],
})
