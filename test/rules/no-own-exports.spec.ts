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
    // `exports: null` disables self-references like a missing field does
    tValid({
      code: 'import pkg from "no-own-exports-null-exports"',
      filename: testFilePath('no-own-exports/null-exports/index.js'),
    }),
    // Only paths that `exports` exposes can be imported by package name
    tValid({
      code: 'import foo from "@no-own-exports/package/src/foo.js"',
      filename,
    }),
    tValid({ code: 'import foo from "@no-own-exports/package/"', filename }),
    tValid({
      code: 'import foo from "@no-own-exports/package/features/internal/foo"',
      filename,
    }),
    tValid({
      code: 'import pkg from "no-own-exports-subpath-only"',
      filename: testFilePath('no-own-exports/subpath-only/index.js'),
    }),
    tValid({
      code: 'import sub from "no-own-exports-conditional/sub"',
      filename: testFilePath('no-own-exports/conditional/index.js'),
    }),
    // A built-in module takes precedence over a self-reference
    tValid({
      code: 'import events from "events"',
      filename: testFilePath('no-own-exports/builtin-name/index.js'),
    }),
    tValid({
      code: 'import pkg from "@no-own-exports/package"',
      filename,
      settings: { 'import-x/core-modules': ['@no-own-exports/package'] },
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
      code: 'import feature from "@no-own-exports/package/features/foo"',
      filename,
      errors: [ownExportsError('@no-own-exports/package/features/foo')],
    }),
    tInvalid({
      code: 'import utils from "no-own-exports-subpath-only/utils"',
      filename: testFilePath('no-own-exports/subpath-only/index.js'),
      errors: [
        {
          messageId: 'ownExports',
          data: {
            importPath: 'no-own-exports-subpath-only/utils',
            packageName: 'no-own-exports-subpath-only',
          },
        },
      ],
    }),
    tInvalid({
      code: 'const pkg = require("no-own-exports-conditional")',
      filename: testFilePath('no-own-exports/conditional/index.js'),
      errors: [
        {
          messageId: 'ownExports',
          data: {
            importPath: 'no-own-exports-conditional',
            packageName: 'no-own-exports-conditional',
          },
        },
      ],
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
