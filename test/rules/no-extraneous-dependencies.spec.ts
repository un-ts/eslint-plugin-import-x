import fs from 'node:fs'
import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import {
  dependencies as deps,
  devDependencies as devDeps,
} from '../fixtures/package.json'
import { parsers, test, testFilePath } from '../utils'

import typescriptConfig from 'eslint-plugin-import-x/config/typescript'
import rule from 'eslint-plugin-import-x/rules/no-extraneous-dependencies'

const ruleTester = new TSESLintRuleTester()
const typescriptRuleTester = new TSESLintRuleTester(typescriptConfig)

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
      test({ code: `import "${pkg}"` }),
      test({ code: `import foo, { bar } from "${pkg}"` }),
      test({ code: `require("${pkg}")` }),
      test({ code: `var foo = require("${pkg}")` }),
      test({ code: `export { foo } from "${pkg}"` }),
      test({ code: `export * from "${pkg}"` }),
    ]),
    test({ code: 'import "eslint"' }),
    test({ code: 'import "eslint/lib/api"' }),
    test({ code: 'import "fs"' }),
    test({ code: 'import "./foo"' }),
    test({ code: 'import "@org/package"' }),

    test({
      code: 'import "electron"',
      settings: { 'import-x/core-modules': ['electron'] },
    }),
    test({
      code: 'import "eslint"',
      options: [{ peerDependencies: true }],
    }),

    // 'project' type
    test({
      code: 'import "importType"',
      settings: {
        'import-x/resolver': {
          node: { paths: [path.join(__dirname, '../fixtures')] },
        },
      },
    }),
    test({
      code: 'import jest from "jest"',
      options: [{ devDependencies: ['*.spec.js'] }],
      filename: 'foo.spec.js',
    }),
    test({
      code: 'import jest from "jest"',
      options: [{ devDependencies: ['*.spec.js'] }],
      filename: path.resolve('foo.spec.js'),
    }),
    test({
      code: 'import jest from "jest"',
      options: [{ devDependencies: ['*.test.js', '*.spec.js'] }],
      filename: path.resolve('foo.spec.js'),
    }),
    test({ code: 'require(6)' }),
    test({
      code: 'import "doctrine"',
      options: [{ packageDir: path.join(__dirname, '../../') }],
    }),
    test({
      code: 'import type MyType from "myflowtyped";',
      options: [{ packageDir: packageDirWithFlowTyped }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: `
        // @flow
        import typeof TypeScriptModule from 'typescript';
      `,
      options: [{ packageDir: packageDirWithFlowTyped }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: 'import react from "react";',
      options: [{ packageDir: packageDirMonoRepoWithNested }],
    }),
    test({
      code: 'import leftpad from "left-pad";',
      options: [
        { packageDir: [packageDirMonoRepoWithNested, packageDirMonoRepoRoot] },
      ],
    }),
    test({
      code: 'import leftpad from "left-pad";',
      options: [{ packageDir: packageDirMonoRepoRoot }],
    }),
    test({
      code: 'import leftpad from "left-pad";',
      options: [{ packageDir: [emptyPackageDir, packageDirMonoRepoRoot] }],
    }),
    test({
      code: 'import leftpad from "left-pad";',
      options: [{ packageDir: [packageDirMonoRepoRoot, emptyPackageDir] }],
    }),
    test({
      code: 'import react from "react";',
      options: [
        { packageDir: [packageDirMonoRepoRoot, packageDirMonoRepoWithNested] },
      ],
    }),
    test({
      code: 'import leftpad from "left-pad";',
      options: [
        { packageDir: [packageDirMonoRepoRoot, packageDirMonoRepoWithNested] },
      ],
    }),
    test({
      code: 'import rightpad from "right-pad";',
      options: [
        { packageDir: [packageDirMonoRepoRoot, packageDirMonoRepoWithNested] },
      ],
    }),
    test({ code: 'import foo from "@generated/foo"' }),
    test({
      code: 'import foo from "@generated/foo"',
      options: [{ packageDir: packageDirBundleDeps }],
    }),
    test({
      code: 'import foo from "@generated/foo"',
      options: [{ packageDir: packageDirBundledDepsAsObject }],
    }),
    test({
      code: 'import foo from "@generated/foo"',
      options: [{ packageDir: packageDirBundledDepsRaceCondition }],
    }),
    test({ code: 'export function getToken() {}' }),
    test({ code: 'export class Component extends React.Component {}' }),
    test({ code: 'export function Component() {}' }),
    test({ code: 'export const Component = () => {}' }),

    test({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      settings: { 'import-x/core-modules': ['not-a-dependency'] },
    }),
    test({
      code: 'import "@generated/bar/module"',
      settings: { 'import-x/core-modules': ['@generated/bar'] },
    }),
    test({
      code: 'import "@generated/bar/and/sub/path"',
      settings: { 'import-x/core-modules': ['@generated/bar'] },
    }),
    // check if "rxjs" dependency declaration fix the "rxjs/operators subpackage
    test({
      code: 'import "rxjs/operators"',
    }),

    test({
      code: 'import "esm-package/esm-module";',
    }),

    test({
      code: `
        import "alias/esm-package/esm-module";
        import 'expose-loader?exposes[]=$&exposes[]=jQuery!jquery';
      `,
      settings: { 'import-x/resolver': 'webpack' },
    }),

    test({
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
  ],
  invalid: [
    test({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoWithNested, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'import "not-a-dependency"',
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'import "not-a-dependency"',
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'var donthaveit = require("@org/not-a-dependency")',
      errors: [
        {
          message:
            "'@org/not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S @org/not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'var donthaveit = require("@org/not-a-dependency/foo")',
      errors: [
        {
          message:
            "'@org/not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S @org/not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'import "eslint"',
      options: [{ devDependencies: false, peerDependencies: false }],
      errors: [
        {
          message:
            "'eslint' should be listed in the project's dependencies, not devDependencies.",
        },
      ],
    }),
    test({
      code: 'import "lodash"',
      options: [{ optionalDependencies: false }],
      errors: [
        {
          message:
            "'lodash' should be listed in the project's dependencies, not optionalDependencies.",
        },
      ],
    }),
    test({
      code: 'var foo = require("not-a-dependency")',
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'var glob = require("glob")',
      options: [{ devDependencies: false }],
      errors: [
        {
          message:
            "'glob' should be listed in the project's dependencies, not devDependencies.",
        },
      ],
    }),
    test({
      code: 'import jest from "jest"',
      options: [{ devDependencies: ['*.test.js'] }],
      filename: 'foo.tes.js',
      errors: [
        {
          message:
            "'jest' should be listed in the project's dependencies, not devDependencies.",
        },
      ],
    }),
    test({
      code: 'import jest from "jest"',
      options: [{ devDependencies: ['*.test.js'] }],
      filename: path.resolve('foo.tes.js'),
      errors: [
        {
          message:
            "'jest' should be listed in the project's dependencies, not devDependencies.",
        },
      ],
    }),
    test({
      code: 'import jest from "jest"',
      options: [{ devDependencies: ['*.test.js', '*.spec.js'] }],
      filename: 'foo.tes.js',
      errors: [
        {
          message:
            "'jest' should be listed in the project's dependencies, not devDependencies.",
        },
      ],
    }),
    test({
      code: 'import jest from "jest"',
      options: [{ devDependencies: ['*.test.js', '*.spec.js'] }],
      filename: path.resolve('foo.tes.js'),
      errors: [
        {
          message:
            "'jest' should be listed in the project's dependencies, not devDependencies.",
        },
      ],
    }),
    test({
      code: 'var eslint = require("lodash")',
      options: [{ optionalDependencies: false }],
      errors: [
        {
          message:
            "'lodash' should be listed in the project's dependencies, not optionalDependencies.",
        },
      ],
    }),
    test({
      code: 'import "not-a-dependency"',
      options: [{ packageDir: path.join(__dirname, '../../') }],
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'import "bar"',
      options: [{ packageDir: path.join(__dirname, './doesn-exist/') }],
      errors: [
        {
          message: 'The package.json file could not be found.',
        },
      ],
    }),
    test({
      code: 'import foo from "foo"',
      options: [{ packageDir: packageDirWithSyntaxError }],
      errors: [
        {
          message: `The package.json file could not be parsed: ${packageFileWithSyntaxErrorMessage}`,
        },
      ],
    }),
    test({
      code: 'import leftpad from "left-pad";',
      filename: path.join(packageDirMonoRepoWithNested, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoWithNested }],
      errors: [
        {
          message:
            "'left-pad' should be listed in the project's dependencies. Run 'npm i -S left-pad' to add it",
        },
      ],
    }),
    test({
      code: 'import react from "react";',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      errors: [
        {
          message:
            "'react' should be listed in the project's dependencies. Run 'npm i -S react' to add it",
        },
      ],
    }),
    test({
      code: 'import react from "react";',
      filename: path.join(packageDirMonoRepoWithNested, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        {
          message:
            "'react' should be listed in the project's dependencies. Run 'npm i -S react' to add it",
        },
      ],
    }),
    test({
      code: 'import "react";',
      filename: path.join(packageDirWithEmpty, 'index.js'),
      options: [{ packageDir: packageDirWithEmpty }],
      errors: [
        {
          message:
            "'react' should be listed in the project's dependencies. Run 'npm i -S react' to add it",
        },
      ],
    }),
    test({
      code: 'import bar from "@generated/bar"',
      errors: [
        "'@generated/bar' should be listed in the project's dependencies. Run 'npm i -S @generated/bar' to add it",
      ],
    }),
    test({
      code: 'import foo from "@generated/foo"',
      options: [{ bundledDependencies: false }],
      errors: [
        "'@generated/foo' should be listed in the project's dependencies. Run 'npm i -S @generated/foo' to add it",
      ],
    }),
    test({
      code: 'import bar from "@generated/bar"',
      options: [{ packageDir: packageDirBundledDepsRaceCondition }],
      errors: [
        "'@generated/bar' should be listed in the project's dependencies. Run 'npm i -S @generated/bar' to add it",
      ],
    }),
    test({
      code: 'export { foo } from "not-a-dependency";',
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'export * from "not-a-dependency";',
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
    test({
      code: 'import jest from "alias/jest";',
      settings: { 'import-x/resolver': 'webpack' },
      errors: [
        {
          // missing dependency is jest not alias
          message:
            "'jest' should be listed in the project's dependencies. Run 'npm i -S jest' to add it",
        },
      ],
    }),

    test({
      code: 'import "not-a-dependency"',
      filename: path.join(packageDirMonoRepoRoot, 'foo.js'),
      options: [{ packageDir: packageDirMonoRepoRoot }],
      errors: [
        {
          message: `'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it`,
        },
      ],
    }),

    test({
      code: 'import "esm-package-not-in-pkg-json/esm-module";',
      errors: [
        {
          message: `'esm-package-not-in-pkg-json' should be listed in the project's dependencies. Run 'npm i -S esm-package-not-in-pkg-json' to add it`,
        },
      ],
    }),

    test({
      code: 'import "not-a-dependency"',
      settings: {
        'import-x/resolver': {
          node: { paths: [path.join(__dirname, '../fixtures')] },
        },
        'import-x/internal-regex': '^not-a-dependency.*',
      },
      options: [{ includeInternal: true }],
      errors: [
        {
          message:
            "'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it",
        },
      ],
    }),
  ],
})

describe('TypeScript', () => {
  const parser = parsers.TS

  const parserConfig = {
    parser,
    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': ['node', 'typescript'],
    },
  }

  ruleTester.run('no-extraneous-dependencies', rule, {
    valid: [
      test({
        code: 'import type T from "a";',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
          },
        ],
        ...parserConfig,
      }),

      test({
        code: 'import type { T } from "a"; export type { T };',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
          },
        ],
        ...parserConfig,
      }),

      test({
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
      test({
        code: 'import T from "a";',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
          },
        ],
        errors: [
          {
            message:
              "'a' should be listed in the project's dependencies, not devDependencies.",
          },
        ],
        ...parserConfig,
      }),

      test({
        code: 'import type T from "a";',
        options: [
          {
            packageDir: packageDirWithTypescriptDevDependencies,
            devDependencies: false,
            includeTypes: true,
          },
        ],
        errors: [
          {
            message:
              "'a' should be listed in the project's dependencies, not devDependencies.",
          },
        ],
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
      test({
        code: 'import type MyType from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      test({
        code: 'import type { MyType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      test({
        code: 'import { type MyType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      test({
        code: 'import { type MyType, type OtherType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
      }),
    ],
    invalid: [
      test({
        code: 'import type { MyType } from "not-a-dependency";',
        options: [{ includeTypes: true }],
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            message: `'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it`,
          },
        ],
      }),
      test({
        code: `import type { Foo } from 'not-a-dependency';`,
        options: [{ includeTypes: true }],
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            message: `'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it`,
          },
        ],
      }),
      test({
        code: 'import Foo, { type MyType } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            message: `'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it`,
          },
        ],
      }),
      test({
        code: 'import { type MyType, Foo } from "not-a-dependency";',
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            message: `'not-a-dependency' should be listed in the project's dependencies. Run 'npm i -S not-a-dependency' to add it`,
          },
        ],
      }),
    ],
  },
)
