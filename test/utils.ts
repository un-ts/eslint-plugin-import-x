import path from 'path'

import { TSESLint } from '@typescript-eslint/utils'
import eslintPkg from 'eslint/package.json'
import semver from 'semver'
import typescriptPkg from 'typescript/package.json'

import type { PluginSettings, RuleContext } from '../src/types'

// warms up the module cache. this import takes a while (>500ms)
import '@babel/eslint-parser'

export const parsers = {
  ESPREE: require.resolve('espree'),
  TS: require.resolve('@typescript-eslint/parser'),
  BABEL: require.resolve('@babel/eslint-parser'),
}

export function tsVersionSatisfies(specifier: string) {
  return semver.satisfies(typescriptPkg.version, specifier)
}

export function typescriptEslintParserSatisfies(specifier: string) {
  return semver.satisfies(
    require('@typescript-eslint/parser/package.json').version,
    specifier,
  )
}

export function testFilePath(relativePath = 'foo.js') {
  return path.resolve('test/fixtures', relativePath)
}

export function getNonDefaultParsers() {
  return [parsers.TS, parsers.BABEL]
}

const FILENAME = testFilePath()

export function eslintVersionSatisfies(specifier: string) {
  return semver.satisfies(eslintPkg.version, specifier)
}

type ValidTestCase = TSESLint.ValidTestCase<readonly unknown[]>

export function testVersion(specifier: string, t: () => ValidTestCase) {
  return eslintVersionSatisfies(specifier) ? test(t()) : []
}

export function test(t: ValidTestCase): ValidTestCase {
  if (arguments.length !== 1) {
    throw new SyntaxError('`test` requires exactly one object argument')
  }
  return {
    filename: FILENAME,
    ...t,
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 9,
      ...t.parserOptions,
    },
  }
}

export function testContext(settings?: PluginSettings) {
  return {
    getFilename() {
      return FILENAME
    },
    settings: settings || {},
  } as RuleContext
}

// TODO: remove this alias
export const getFilename = testFilePath

/**
 * to be added as valid cases just to ensure no nullable fields are going
 * to crash at runtime
 */
export const SYNTAX_CASES = [
  test({ code: 'for (let { foo, bar } of baz) {}' }),
  test({ code: 'for (let [ foo, bar ] of baz) {}' }),

  test({ code: 'const { x, y } = bar' }),
  test({ code: 'const { x, y, ...z } = bar', parser: parsers.BABEL }),

  // all the exports
  test({ code: 'let x; export { x }' }),
  test({ code: 'let x; export { x as y }' }),

  // not sure about these since they reference a file
  // test({ code: 'export { x } from "./y.js"'}),
  // test({ code: 'export * as y from "./y.js"', parser: parsers.BABEL}),

  test({ code: 'export const x = null' }),
  test({ code: 'export var x = null' }),
  test({ code: 'export let x = null' }),

  test({ code: 'export default x' }),
  test({ code: 'export default class x {}' }),

  // issue #267: parser opt-in extension list
  test({
    code: 'import json from "./data.json"',
    settings: { 'import-x/extensions': ['.js'] }, // breaking: remove for v2
  }),

  // JSON
  test({
    code: 'import foo from "./foobar.json";',
    settings: { 'import-x/extensions': ['.js'] }, // breaking: remove for v2
  }),
  test({
    code: 'import foo from "./foobar";',
    settings: { 'import-x/extensions': ['.js'] }, // breaking: remove for v2
  }),

  // issue #370: deep commonjs import
  test({
    code: 'import { foo } from "./issue-370-commonjs-namespace/bar"',
    settings: { 'import-x/ignore': ['foo'] },
  }),

  // issue #348: deep commonjs re-export
  test({
    code: 'export * from "./issue-370-commonjs-namespace/bar"',
    settings: { 'import-x/ignore': ['foo'] },
  }),

  test({
    code: 'import * as a from "./commonjs-namespace/a"; a.b',
  }),

  // ignore invalid extensions
  test({
    code: 'import { foo } from "./ignore.invalid.extension"',
  }),
]

export const testCompiled = process.env.TEST_COMPILED === '1'

export const srcDir = testCompiled ? 'lib' : 'src'
