import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-self-package-import'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const filename = testFilePath('no-self-package-import/src/foo.js')
const tsFilename = testFilePath('no-self-package-import/src/foo.ts')

const selfPackageImportError = (importPath: string) =>
  ({
    messageId: 'selfPackageImport',
    data: { importPath, packageName: '@no-self-package-import/package' },
  }) as const

ruleTester.run('no-self-package-import', rule, {
  valid: [
    tValid({ code: 'import sub from "./sub"', filename }),
    tValid({ code: 'import pkg from "../index.js"', filename }),
    tValid({ code: 'import _ from "lodash"', filename }),
    tValid({
      code: 'import foo from "@no-self-package-import/package-other"',
      filename,
    }),
    tValid({
      code: 'import foo from "@no-self-package-import/other"',
      filename,
    }),
    tValid({ code: 'import foo from "#internal"', filename }),
    tValid({ code: 'const sub = require("./sub")', filename }),
    tValid({ code: 'import(variable)', filename }),
    tValid({ code: 'require(`@no-self-package-import/${name}`)', filename }),
    // A package without `exports` cannot import itself through them
    tValid({
      code: 'import pkg from "no-self-package-import-without-exports"',
      filename: testFilePath('no-self-package-import/no-exports/index.js'),
    }),
    // `exports: null` disables self-references like a missing field does
    tValid({
      code: 'import pkg from "no-self-package-import-null-exports"',
      filename: testFilePath('no-self-package-import/null-exports/index.js'),
    }),
    // Only paths that `exports` exposes can be imported by package name
    tValid({
      code: 'import foo from "@no-self-package-import/package/src/foo.js"',
      filename,
    }),
    tValid({
      code: 'import foo from "@no-self-package-import/package/"',
      filename,
    }),
    // Node.js ignores a key ending in `/` (a removed folder mapping)
    tValid({
      code: 'import foo from "@no-self-package-import/package/folder/"',
      filename,
    }),
    // Node.js rejects `exports` mixing subpath and condition keys
    ...[
      'no-self-package-import-mixed-keys',
      'no-self-package-import-mixed-keys/utils',
    ].map(importPath =>
      tValid({
        code: `import pkg from "${importPath}"`,
        filename: testFilePath('no-self-package-import/mixed-keys/index.js'),
      }),
    ),
    tValid({
      code: 'import foo from "@no-self-package-import/package/features/internal/foo"',
      filename,
    }),
    tValid({
      code: 'import pkg from "no-self-package-import-subpath-only"',
      filename: testFilePath('no-self-package-import/subpath-only/index.js'),
    }),
    // A string `exports` only exposes the package root
    tValid({
      code: 'import sub from "no-self-package-import-string-exports/index.js"',
      filename: testFilePath('no-self-package-import/string-exports/index.js'),
    }),
    tValid({
      code: 'import sub from "no-self-package-import-conditional/sub"',
      filename: testFilePath('no-self-package-import/conditional/index.js'),
    }),
    // Node.js rejects a target that does not start with `./` or that has a
    // `.`, `..` or `node_modules` segment
    ...[
      'no-self-package-import-invalid-targets',
      'no-self-package-import-invalid-targets/parent',
      'no-self-package-import-invalid-targets/nested-parent',
      'no-self-package-import-invalid-targets/current',
      'no-self-package-import-invalid-targets/encoded',
      'no-self-package-import-invalid-targets/node-modules',
      'no-self-package-import-invalid-targets/absolute',
      'no-self-package-import-invalid-targets/conditional',
      // a directory target cannot be loaded
      'no-self-package-import-invalid-targets/root-directory',
      'no-self-package-import-invalid-targets/directory',
    ].map(importPath =>
      tValid({
        code: `import pkg from "${importPath}"`,
        filename: testFilePath(
          'no-self-package-import/invalid-targets/index.js',
        ),
      }),
    ),
    // ...and a `*` substitution with such a segment
    ...[
      '@no-self-package-import/package/features/../sub',
      '@no-self-package-import/package/features/a/./b',
      '@no-self-package-import/package/features/%2e%2E/sub',
      '@no-self-package-import/package/features/node_modules/dep',
      '@no-self-package-import/package/features/NODE_MODULES/dep',
      String.raw`@no-self-package-import/package/features/a\..\b`,
    ].map(importPath =>
      tValid({
        code: `import foo from ${JSON.stringify(importPath)}`,
        filename,
      }),
    ),
    // A built-in module takes precedence over a self-reference
    tValid({
      code: 'import events from "events"',
      filename: testFilePath('no-self-package-import/builtin-name/index.js'),
    }),
    tValid({
      code: 'import pkg from "@no-self-package-import/package"',
      filename,
      settings: {
        'import-x/core-modules': ['@no-self-package-import/package'],
      },
    }),
    tValid({
      code: 'import pkg from "@no-self-package-import/package"',
      filename: testFilePath('no-self-package-import/test/foo.spec.js'),
      options: [{ allowInFiles: ['**/test/**'] }],
    }),
    tValid({
      code: 'import pkg from "@no-self-package-import/package"',
      filename: testFilePath('no-self-package-import/test/foo.spec.js'),
      options: [
        { allowInFiles: ['test/fixtures/no-self-package-import/test/*.js'] },
      ],
    }),
    // A resolver alias points the package's own name at another package
    tValid({
      code: 'import pkg from "@no-self-package-import/package"',
      filename,
      settings: {
        'import-x/resolver': {
          webpack: {
            config: {
              resolve: {
                alias: {
                  '@no-self-package-import/package':
                    testFilePath('package-named'),
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
      code: 'import pkg from "@no-self-package-import/package"',
      filename,
      errors: [selfPackageImportError('@no-self-package-import/package')],
    }),
    tInvalid({
      code: 'import sub from "@no-self-package-import/package/sub"',
      filename,
      errors: [selfPackageImportError('@no-self-package-import/package/sub')],
    }),
    tInvalid({
      code: 'export { default } from "@no-self-package-import/package"',
      filename,
      errors: [selfPackageImportError('@no-self-package-import/package')],
    }),
    tInvalid({
      code: 'export * from "@no-self-package-import/package/sub"',
      filename,
      errors: [selfPackageImportError('@no-self-package-import/package/sub')],
    }),
    tInvalid({
      code: 'import("@no-self-package-import/package")',
      filename,
      errors: [selfPackageImportError('@no-self-package-import/package')],
    }),
    tInvalid({
      code: 'const pkg = require("@no-self-package-import/package")',
      filename,
      errors: [selfPackageImportError('@no-self-package-import/package')],
    }),
    tInvalid({
      code: 'import feature from "@no-self-package-import/package/features/foo"',
      filename,
      errors: [
        selfPackageImportError('@no-self-package-import/package/features/foo'),
      ],
    }),
    tInvalid({
      code: 'import feature from "@no-self-package-import/package/features/a/b.c"',
      filename,
      errors: [
        selfPackageImportError(
          '@no-self-package-import/package/features/a/b.c',
        ),
      ],
    }),
    // A fallback array skips an invalid target, as Node.js does
    tInvalid({
      code: 'import pkg from "no-self-package-import-invalid-targets/fallback"',
      filename: testFilePath('no-self-package-import/invalid-targets/index.js'),
      errors: [
        {
          messageId: 'selfPackageImport',
          data: {
            importPath: 'no-self-package-import-invalid-targets/fallback',
            packageName: 'no-self-package-import-invalid-targets',
          },
        },
      ],
    }),
    tInvalid({
      code: 'import utils from "no-self-package-import-subpath-only/utils"',
      filename: testFilePath('no-self-package-import/subpath-only/index.js'),
      errors: [
        {
          messageId: 'selfPackageImport',
          data: {
            importPath: 'no-self-package-import-subpath-only/utils',
            packageName: 'no-self-package-import-subpath-only',
          },
        },
      ],
    }),
    tInvalid({
      code: 'import pkg from "no-self-package-import-string-exports"',
      filename: testFilePath('no-self-package-import/string-exports/index.js'),
      errors: [
        {
          messageId: 'selfPackageImport',
          data: {
            importPath: 'no-self-package-import-string-exports',
            packageName: 'no-self-package-import-string-exports',
          },
        },
      ],
    }),
    tInvalid({
      code: 'const pkg = require("no-self-package-import-conditional")',
      filename: testFilePath('no-self-package-import/conditional/index.js'),
      errors: [
        {
          messageId: 'selfPackageImport',
          data: {
            importPath: 'no-self-package-import-conditional',
            packageName: 'no-self-package-import-conditional',
          },
        },
      ],
    }),
    tInvalid({
      code: 'import "@no-self-package-import/package"',
      filename: testFilePath('no-self-package-import/test/foo.spec.js'),
      options: [{ allowInFiles: ['**/src/**'] }],
      errors: [selfPackageImportError('@no-self-package-import/package')],
    }),
  ],
})

ruleTester.run('no-self-package-import (type imports)', rule, {
  valid: [
    tValid({
      code: 'import type { Foo } from "@no-self-package-import/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
    }),
    tValid({
      code: 'import { type Foo } from "@no-self-package-import/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
    }),
    tValid({
      code: 'export type { Foo } from "@no-self-package-import/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import type { Foo } from "@no-self-package-import/package"',
      filename: tsFilename,
      errors: [selfPackageImportError('@no-self-package-import/package')],
    }),
    tInvalid({
      code: 'import { type Foo, bar } from "@no-self-package-import/package"',
      filename: tsFilename,
      options: [{ ignoreTypeImports: true }],
      errors: [selfPackageImportError('@no-self-package-import/package')],
    }),
  ],
})
