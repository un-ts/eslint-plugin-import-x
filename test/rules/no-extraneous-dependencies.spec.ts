import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { CjsRequire } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, createRuleTestCaseFunctions, testFilePath } from '../utils.js'

import typescriptConfig from 'eslint-plugin-import-x/config/flat/typescript'
import rule from 'eslint-plugin-import-x/rules/no-extraneous-dependencies'

const require: CjsRequire = createRequire(import.meta.url)

const _dirname = path.dirname(fileURLToPath(import.meta.url))

const { dependencies: deps, devDependencies: devDeps } = require<{
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}>('../fixtures/package.json')

const ruleTester = new TSESLintRuleTester()
const typescriptRuleTester = new TSESLintRuleTester(typescriptConfig)

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const packageDirWithSyntaxError = testFilePath('with-syntax-error')

const packageFileWithSyntaxErrorMessage = (() => {
  try {
    JSON.parse(
      fs.readFileSync(
        path.resolve(packageDirWithSyntaxError, 'package.json'),
        'utf8',
      ),
    )
  } catch (error) {
    return (error as Error).message
  }
})()

const packageDirWithFlowTyped = testFilePath('with-flow-typed')
const packageDirWithTypescriptDevDependencies = testFilePath(
  'with-typescript-dev-dependencies',
)
const packageDirMonoRepoRoot = testFilePath('monorepo')
const packageDirMonoRepoWithNested = testFilePath(
  'monorepo/packages/nested-package',
)
const packageDirWithEmpty = testFilePath('empty')
const packageDirBundleDeps = testFilePath(
  'bundled-dependencies/as-array-bundle-deps',
)
const packageDirBundledDepsAsObject = testFilePath(
  'bundled-dependencies/as-object',
)
const packageDirBundledDepsRaceCondition = testFilePath(
  'bundled-dependencies/race-condition',
)
const emptyPackageDir = testFilePath('empty-folder')

ruleTester.run('no-extraneous-dependencies', rule, {
  valid: [
    ...[...Object.keys(deps), ...Object.keys(devDeps)].flatMap(pkg => [
      tValid({ code: `import "${pkg}"` }),
      tValid({ code: `import foo, { bar } from "${pkg}"` }),
      tValid({ code: `require("${pkg}")` }),
      tValid({ code: `var foo = require("${pkg}")` }),
      tValid({ code: `export { foo } from "${pkg}"` }),
      tValid({ code: `export * from "${pkg}"` }),
    ]),
    tValid({ code: 'import "eslint/lib/api"' }),
    tValid({ code: 'import "fs"' }),
    tValid({ code: 'import "./foo"' }),

    tValid({
      code: 'import "electron"',
      settings: { 'import-x/core-modules': ['electron'] },
    }),
    tValid({
      code: 'import "eslint"',
      options: [{ peerDependencies: true }],
    }),

    // 'project' type
    tValid({
      code: 'import "importType"',
      settings: {
        'import-x/resolver': {
          node: { paths: [path.join(_dirname, '../fixtures')] },
        },
      },
    }),
    tValid({
      code: 'import vitest from "vitest"',
      options: [{ devDependencies: ['*.spec.js'] }],
      filename: 'foo.spec.js',
    }),
    tValid({
      code: 'import vitest from "vitest"',
      options: [{ devDependencies: ['*.spec.js'] }],
      filename: path.resolve('foo.spec.js'),
    }),
    tValid({
      code: 'import vitest from "vitest"',
      options: [{ devDependencies: ['*.test.js', '*.spec.js'] }],
      filename: path.resolve('foo.spec.js'),
    }),
    tValid({ code: 'require(6)' }),
    tValid({
      code: 'import "doctrine"',
      options: [{ packageDir: path.join(_dirname, '../../') }],
    }),
    tValid({
      code: 'import type MyType from "myflowtyped";',
      options: [{ packageDir: packageDirWithFlowTyped }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `
        // @flow
        import typeof TypeScriptModule from 'typescript';
      `,
      options: [{ packageDir: packageDirWithFlowTyped }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import react from "react";',
      options: [{ packageDir: packageDirMonoRepoWithNested }],
    }),
    tValid({
      code: 'import leftpad from "left-pad";',
      options: [
        { packageDir: [packageDirMonoRepoWithNested, packageDirMonoRepoRoot] },
      ],
    }),
    tValid({
      code: 'import leftpad from "left-pad";',
      options: [{ packageDir: packageDirMonoRepoRoot }],
    }),
    tValid({
      code: 'import leftpad from "left-pad";',
      options: [{ packageDir: [emptyPackageDir, packageDirMonoRepoRoot] }],
    }),
    tValid({
      code: 'import leftpad from "left-pad";',
      options: [{ packageDir: [packageDirMonoRepoRoot, emptyPackageDir] }],
    }),
    tValid({
      code: 'import react from "react";',
      options: [
        { packageDir: [packageDirMonoRepoRoot, packageDirMonoRepoWithNested] },
      ],
    }),
    tValid({
      code: 'import leftpad from "left-pad";',
      options: [
        { packageDir: [packageDirMonoRepoRoot, packageDirMonoRepoWithNested] },
      ],
    }),
    tValid({
      code: 'import rightpad from "right-pad";',
      options: [
        { packageDir: [packageDirMonoRepoRoot, packageDirMonoRepoWithNested] },
      ],
    }),
    tValid({ code: 'import foo from "@generated/foo"' }),
    tValid({
      code: 'import foo from "@generated/foo"',
      options: [{ packageDir: packageDirBundleDeps }],
    }),
    tValid({
      code: 'import foo from "@generated/foo"',
      options: [{ packageDir: packageDirBundledDepsAsObject }],
    }),
    tValid({
      code: 'import foo from "@generated/foo"',
      options: [{ packageDir: packageDirBundledDepsRaceCondition }],
    }),
    tValid({ code: 'export function getToken() {}' }),
    tValid({ code: 'export class Component extends React.Component {}' }),
    tValid({ code: 'export function Component() {}' }),
    tValid({ code: 'export const Component = () => {}' }),

    tValid({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      settings: { 'import-x/core-modules': ['not-a-dependency'] },
    }),
    tValid({
      code: 'import "@generated/bar/module"',
      settings: { 'import-x/core-modules': ['@generated/bar'] },
    }),
    tValid({
      code: 'import "@generated/bar/and/sub/path"',
      settings: { 'import-x/core-modules': ['@generated/bar'] },
    }),
    // check if "rxjs" dependency declaration fix the "rxjs/operators subpackage
    tValid({
      code: 'import "rxjs/operators"',
    }),

    tValid({
      code: 'import "esm-package/esm-module";',
    }),

    tValid({
      code: `
        import "alias/esm-package/esm-module";
        import 'expose-loader?exposes[]=$&exposes[]=jQuery!jquery';
      `,
      settings: { 'import-x/resolver': 'webpack' },
    }),

    tValid({
      code: 'import "@custom-internal-alias/api/service";',
      settings: {
        'import-x/resolver': {
          webpack: {
            config: {
              resolve: {
                alias: {
                  '@custom-internal-alias': testFilePath('internal-modules'),
                },
              },
            },
          },
        },
      },
    }),

    tValid({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      options: [
        { packageDir: packageDirMonoRepoRoot, whitelist: ['not-a-dependency'] },
      ],
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoWithNested, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'import "not-a-dependency"',
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'import "not-a-dependency"',
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'var donthaveit = require("@org/not-a-dependency")',
      errors: [
        {
          messageId: 'missing',
          data: { packageName: '@org/not-a-dependency' },
        },
      ],
    }),
    tInvalid({
      code: 'var donthaveit = require("@org/not-a-dependency/foo")',
      errors: [
        {
          messageId: 'missing',
          data: { packageName: '@org/not-a-dependency' },
        },
      ],
    }),
    tInvalid({
      code: 'import "eslint"',
      options: [{ devDependencies: false, peerDependencies: false }],
      errors: [{ messageId: 'devDep', data: { packageName: 'eslint' } }],
    }),
    tInvalid({
      code: 'import "lodash"',
      options: [{ optionalDependencies: false }],
      errors: [{ messageId: 'optDep', data: { packageName: 'lodash' } }],
    }),
    tInvalid({
      code: 'var foo = require("not-a-dependency")',
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'var glob = require("glob")',
      options: [{ devDependencies: false }],
      errors: [{ messageId: 'devDep', data: { packageName: 'glob' } }],
    }),
    tInvalid({
      code: 'import vitest from "vitest"',
      options: [{ devDependencies: ['*.test.js'] }],
      filename: 'foo.tes.js',
      errors: [{ messageId: 'devDep', data: { packageName: 'vitest' } }],
    }),
    tInvalid({
      code: 'import vitest from "vitest"',
      options: [{ devDependencies: ['*.test.js'] }],
      filename: path.resolve('foo.tes.js'),
      errors: [{ messageId: 'devDep', data: { packageName: 'vitest' } }],
    }),
    tInvalid({
      code: 'import vitest from "vitest"',
      options: [{ devDependencies: ['*.test.js', '*.spec.js'] }],
      filename: 'foo.tes.js',
      errors: [{ messageId: 'devDep', data: { packageName: 'vitest' } }],
    }),
    tInvalid({
      code: 'import vitest from "vitest"',
      options: [{ devDependencies: ['*.test.js', '*.spec.js'] }],
      filename: path.resolve('foo.tes.js'),
      errors: [{ messageId: 'devDep', data: { packageName: 'vitest' } }],
    }),
    tInvalid({
      code: 'var eslint = require("lodash")',
      options: [{ optionalDependencies: false }],
      errors: [{ messageId: 'optDep', data: { packageName: 'lodash' } }],
    }),
    tInvalid({
      code: 'import "not-a-dependency"',
      options: [{ packageDir: path.join(_dirname, '../../') }],
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'import "bar"',
      options: [{ packageDir: path.join(_dirname, './doesn-exist/') }],
      errors: [{ messageId: 'pkgNotFound' }],
    }),
    tInvalid({
      code: 'import foo from "foo"',
      options: [{ packageDir: packageDirWithSyntaxError }],
      errors: [
        {
          messageId: 'pkgUnparsable',
          data: { error: packageFileWithSyntaxErrorMessage },
        },
      ],
    }),
    tInvalid({
      code: 'import leftpad from "left-pad";',
      filename: path.join(packageDirMonoRepoWithNested, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoWithNested }],
      errors: [{ messageId: 'missing', data: { packageName: 'left-pad' } }],
    }),
    tInvalid({
      code: 'import react from "react";',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      errors: [{ messageId: 'missing', data: { packageName: 'react' } }],
    }),
    tInvalid({
      code: 'import react from "react";',
      filename: path.join(packageDirMonoRepoWithNested, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [{ messageId: 'missing', data: { packageName: 'react' } }],
    }),
    tInvalid({
      code: 'import "react";',
      filename: path.join(packageDirWithEmpty, 'index.js'),
      options: [{ packageDir: packageDirWithEmpty }],
      errors: [{ messageId: 'missing', data: { packageName: 'react' } }],
    }),
    tInvalid({
      code: 'import bar from "@generated/bar"',
      errors: [
        { messageId: 'missing', data: { packageName: '@generated/bar' } },
      ],
    }),
    tInvalid({
      code: 'import foo from "@generated/foo"',
      options: [{ bundledDependencies: false }],
      errors: [
        { messageId: 'missing', data: { packageName: '@generated/foo' } },
      ],
    }),
    tInvalid({
      code: 'import bar from "@generated/bar"',
      options: [{ packageDir: packageDirBundledDepsRaceCondition }],
      errors: [
        { messageId: 'missing', data: { packageName: '@generated/bar' } },
      ],
    }),
    tInvalid({
      code: 'export { foo } from "not-a-dependency";',
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'export * from "not-a-dependency";',
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
    tInvalid({
      code: 'import vitest from "alias/vitest";',
      settings: { 'import-x/resolver': 'webpack' },
      errors: [
        // missing dependency is vitest not alias
        { messageId: 'missing', data: { packageName: 'vitest' } },
      ],
    }),

    tInvalid({
      code: 'import "esm-package-not-in-pkg-json/esm-module";',
      errors: [
        {
          messageId: 'missing',
          data: { packageName: 'esm-package-not-in-pkg-json' },
        },
      ],
    }),

    tInvalid({
      code: 'import "not-a-dependency"',
      settings: {
        'import-x/resolver': {
          node: { paths: [path.join(_dirname, '../fixtures')] },
        },
        'import-x/internal-regex': '^not-a-dependency.*',
      },
      options: [{ includeInternal: true }],
      errors: [
        { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
      ],
    }),
  ],
})

describe('TypeScript', () => {
  const parserConfig = {
    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': ['node', 'typescript'],
    },
  }

  ruleTester.run('no-extraneous-dependencies', rule, {
    valid: [
      tValid({
        code: 'import type T from "a";',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
          },
        ],
        ...parserConfig,
      }),

      tValid({
        code: 'import type { T } from "a"; export type { T };',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
          },
        ],
        ...parserConfig,
      }),

      tValid({
        code: 'export type { T } from "a";',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
          },
        ],
        ...parserConfig,
      }),
    ],
    invalid: [
      tInvalid({
        code: 'import T from "a";',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
          },
        ],
        errors: [{ messageId: 'devDep', data: { packageName: 'a' } }],
        ...parserConfig,
      }),

      tInvalid({
        code: 'import type T from "a";',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
            includeTypes: true,
          },
        ],
        errors: [{ messageId: 'devDep', data: { packageName: 'a' } }],
        ...parserConfig,
      }),
    ],
  })
})

typescriptRuleTester.run(
  'no-extraneous-dependencies typescript type imports',
  rule,
  {
    valid: [
      tValid({
        code: 'import type MyType from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tValid({
        code: 'import type { MyType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tValid({
        code: 'import { type MyType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tValid({
        code: 'import { type MyType, type OtherType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
    ],
    invalid: [
      tInvalid({
        code: 'import type { MyType } from "not-a-dependency";',
        options: [{ includeTypes: true }],
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
        ],
      }),
      tInvalid({
        code: `import type { Foo } from 'not-a-dependency';`,
        options: [{ includeTypes: true }],
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
        ],
      }),
      tInvalid({
        code: 'import Foo, { type MyType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
        ],
      }),
      tInvalid({
        code: 'import { type MyType, Foo } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          { messageId: 'missing', data: { packageName: 'not-a-dependency' } },
        ],
      }),
    ],
  },
)
