import path from 'node:path'

import { cjsRequire as require } from '@pkgr/core'
import type {
  ValidTestCase as TSESLintValidTestCase,
  InvalidTestCase as TSESLintInvalidTestCase,
  RunTests as TSESLintRunTests,
} from '@typescript-eslint/rule-tester'
import type { RuleModule } from '@typescript-eslint/utils/ts-eslint'
import * as semver from 'semver'
import typescriptPkg from 'typescript/package.json'

import type { PluginSettings, RuleContext } from 'eslint-plugin-import-x/types'

// warms up the module cache. this import takes a while (>500ms)
import '@babel/eslint-parser'

export const parsers = {
  ESPREE: require.resolve('espree'),
  TS: require.resolve('@typescript-eslint/parser'),
  BABEL: require.resolve('@babel/eslint-parser'),
  HERMES: require.resolve('hermes-eslint'),
}

export function tsVersionSatisfies(specifier: string) {
  return semver.satisfies(typescriptPkg.version, specifier)
}

export function typescriptEslintParserSatisfies(specifier: string) {
  return semver.satisfies(
    require<{ version: string }>('@typescript-eslint/parser/package.json')
      .version,
    specifier,
  )
}

export const FIXTURES_PATH = path.resolve('test/fixtures')

export function testFilePath(relativePath = 'foo.js') {
  return path.resolve(FIXTURES_PATH, relativePath)
}

export function getNonDefaultParsers() {
  return [parsers.TS, parsers.BABEL] as const
}

export const TEST_FILENAME = testFilePath()

/** @warning DO NOT EXPORT THIS. Use {@link createRuleTestCaseFunctions} instead */
function createRuleTestCase<TTestCase extends TSESLintValidTestCase<unknown[]>>(
  t: TTestCase,
): TTestCase {
  return {
    filename: TEST_FILENAME,
    ...t,
    languageOptions: {
      ...t.languageOptions,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 9,
        ...t.languageOptions?.parserOptions,
      },
    },
  }
}

type GetRuleModuleTypes<TRule> =
  TRule extends RuleModule<infer MessageIds, infer Options>
    ? {
        messageIds: MessageIds
        options: Options
      }
    : never

export type GetRuleModuleMessageIds<TRule> =
  TRule extends RuleModule<infer MessageIds, infer _> ? MessageIds : never

export type GetRuleModuleOptions<TRule> =
  TRule extends RuleModule<infer _, infer Options> ? Options : never

/**
 * Type helper to build {@link TSESLintRuleTester.run} test parameters from a
 * given {@link RuleModule}
 *
 * @example
 *   const COMMON_TESTS: RunTests<typeof rule> = {
 *     valid: [
 *       {
 *         code: "import Foo from 'Foo';",
 *         options: [],
 *       },
 *     ],
 *     invalid: [
 *       {
 *         code: "import Foo from 'Foo';",
 *         options: ['prefer-top-level'],
 *         errors: [],
 *       },
 *     ],
 *   }
 */
export type RuleRunTests<
  TRule extends RuleModule<string, readonly unknown[]>,
  TRuleType extends GetRuleModuleTypes<TRule> = GetRuleModuleTypes<TRule>,
> = TSESLintRunTests<TRuleType['messageIds'], TRuleType['options']>

/**
 * Create two functions that can be used to create both valid and invalid test
 * case to be provided to {@link TSESLintRuleTester}. This function accepts one
 * type parameter that should extend a {@link RuleModule} to be able to provide
 * the result with typed `MessageIds` and `Options` properties
 *
 * @example
 *   import { createRuleTestCaseFunction } from '../utils'
 *
 *   const ruleTester = new TSESLintRuleTester()
 *
 *   const { tValid, tInvalid } = createRuleTestCaseFunction<typeof rule>()
 *
 *   ruleTester.run(`no-useless-path-segments (${resolver})`, rule, {
 *     valid: [
 *       tValid({
 *         code: '...',
 *       }),
 *     ],
 *     invalid: [
 *       tInvalid({
 *         code: '...',
 *       }),
 *     ],
 *   })
 *
 * @param defaultOptions If you have a specific set of options that need to be
 *   passed to each test case you can supply them directly to this function.
 *
 *   If the `TRule` parameter is omitted default types are used.
 */
export function createRuleTestCaseFunctions<
  TRule extends RuleModule<string, unknown[]>,
  TData extends GetRuleModuleTypes<TRule> = GetRuleModuleTypes<TRule>,
  Valid = TSESLintValidTestCase<TData['options']>,
  Invalid = TSESLintInvalidTestCase<TData['messageIds'], TData['options']>,
>(
  defaultOptions: Pick<
    TSESLintValidTestCase<TData['options']>,
    'filename' | 'languageOptions' | 'settings'
  > = {},
): { tValid: (t: Valid) => Valid; tInvalid: (t: Invalid) => Invalid } {
  return {
    tValid: t => createRuleTestCase({ ...defaultOptions, ...t } as never),
    tInvalid: t => createRuleTestCase({ ...defaultOptions, ...t } as never),
  }
}

export function testContext(settings?: PluginSettings) {
  return {
    physicalFilename: TEST_FILENAME,
    settings: settings || {},
  } as RuleContext
}

/**
 * To be added as valid cases just to ensure no nullable fields are going to
 * crash at runtime
 */
export const SYNTAX_VALID_CASES: TSESLintRunTests<string, unknown[]>['valid'] =
  [
    'for (let { foo, bar } of baz) {}',
    'for (let [ foo, bar ] of baz) {}',

    'const { x, y } = bar',
    createRuleTestCase({
      code: 'const { x, y, ...z } = bar',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // all the exports
    'let x; export { x }',
    'let x; export { x as y }',

    // not sure about these since they reference a file
    // 'export { x } from "./y.js"'}),
    // 'export * as y from "./y.js"', languageOptions: { parser: require(parsers.BABEL) } }),

    'export const x = null',
    'export var x = null',
    'export let x = null',

    'export default x',
    'export default class x {}',

    // issue #267: parser opt-in extension list
    createRuleTestCase({
      code: 'import json from "./data.json"',
      settings: { 'import-x/extensions': ['.js'] }, // breaking: remove for v2
    }),

    // JSON
    createRuleTestCase({
      code: 'import foo from "./foobar.json";',
      settings: { 'import-x/extensions': ['.js'] }, // breaking: remove for v2
    }),
    createRuleTestCase({
      code: 'import foo from "./foobar";',
      settings: { 'import-x/extensions': ['.js'] }, // breaking: remove for v2
    }),

    // issue #370: deep commonjs import
    createRuleTestCase({
      code: 'import { foo } from "./issue-370-commonjs-namespace/bar"',
      settings: { 'import-x/ignore': ['foo'] },
    }),

    // issue #348: deep commonjs re-export
    createRuleTestCase({
      code: 'export * from "./issue-370-commonjs-namespace/bar"',
      settings: { 'import-x/ignore': ['foo'] },
    }),

    createRuleTestCase({
      code: 'import * as a from "./commonjs-namespace/a"; a.b',
    }),

    // ignore invalid extensions
    createRuleTestCase({
      code: 'import { foo } from "./ignore.invalid.extension"',
    }),
  ]

export const testCompiled = process.env.TEST_COMPILED === '1'

export const srcDir = testCompiled ? 'lib' : 'src'
