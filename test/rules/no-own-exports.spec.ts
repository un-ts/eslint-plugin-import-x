import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-own-exports'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const filename = testFilePath('no-own-exports/src/foo.js')
const tsFilename = testFilePath('no-own-exports/src/foo.ts')

const ownExportsError = (importPath: string) =>
  ({
    messageId: 'ownExports',
    data: { importPath, packageName: '@no-own-exports/package' },
  }) as const

ruleTester.run('no-own-exports', rule, {
  valid: [
    tValid({ code: 'import sub from "./sub"', filename }),
    tValid({ code: 'import pkg from "../index.js"', filename }),
    tValid({ code: 'import _ from "lodash"', filename }),
    tValid({
      code: 'import foo from "@no-own-exports/package-other"',
      filename,
    }),
    tValid({ code: 'import foo from "@no-own-exports/other"', filename }),
    tValid({ code: 'import foo from "#internal"', filename }),
    tValid({ code: 'const sub = require("./sub")', filename }),
    tValid({ code: 'import(variable)', filename }),
    tValid({ code: 'require(`@no-own-exports/${name}`)', filename }),
    // A package without `exports` cannot import itself through them
    tValid({
      code: 'import pkg from "no-own-exports-without-exports"',
      filename: testFilePath('no-own-exports/no-exports/index.js'),
    }),
    tValid({
      code: 'import pkg from "@no-own-exports/package"',
      filename: testFilePath('no-own-exports/test/foo.spec.js'),
      options: [{ allowInFiles: ['**/test/**'] }],
    }),
    tValid({
      code: 'import pkg from "@no-own-exports/package"',
      filename: testFilePath('no-own-exports/test/foo.spec.js'),
      options: [{ allowInFiles: ['test/fixtures/no-own-exports/test/*.js'] }],
    }),
    // A resolver alias points the package's own name at another package
    tValid({
      code: 'import pkg from "@no-own-exports/package"',
      filename,
      settings: {
        'import-x/resolver': {
          webpack: {
            config: {
              resolve: {
                alias: {
                  '@no-own-exports/package': testFilePath('package-named'),
                },
              },
            },
          },
        },
      },
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import pkg from "@no-own-exports/package"',
      filename,
      errors: [ownExportsError('@no-own-exports/package')],
    }),
    tInvalid({
      code: 'import sub from "@no-own-exports/package/sub"',
      filename,
      errors: [ownExportsError('@no-own-exports/package/sub')],
    }),
    tInvalid({
      code: 'export { default } from "@no-own-exports/package"',
      filename,
      errors: [ownExportsError('@no-own-exports/package')],
    }),
    tInvalid({
      code: 'export * from "@no-own-exports/package/sub"',
      filename,
      errors: [ownExportsError('@no-own-exports/package/sub')],
    }),
    tInvalid({
      code: 'import("@no-own-exports/package")',
      filename,
      errors: [ownExportsError('@no-own-exports/package')],
    }),
    tInvalid({
      code: 'const pkg = require("@no-own-exports/package")',
      filename,
      errors: [ownExportsError('@no-own-exports/package')],
    }),
    tInvalid({
      code: 'import "@no-own-exports/package"',
      filename: testFilePath('no-own-exports/test/foo.spec.js'),
      options: [{ allowInFiles: ['**/src/**'] }],
      errors: [ownExportsError('@no-own-exports/package')],
    }),
  ],
})

ruleTester.run('no-own-exports (type imports)', rule, {
  valid: [
    tValid({
      code: 'import type { Foo } from "@no-own-exports/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
    }),
    tValid({
      code: 'import { type Foo } from "@no-own-exports/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
    }),
    tValid({
      code: 'export type { Foo } from "@no-own-exports/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import type { Foo } from "@no-own-exports/package"',
      filename: tsFilename,
      errors: [ownExportsError('@no-own-exports/package')],
    }),
    tInvalid({
      code: 'import { type Foo, bar } from "@no-own-exports/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
      errors: [ownExportsError('@no-own-exports/package')],
    }),
  ],
})
