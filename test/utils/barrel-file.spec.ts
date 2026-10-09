import { testFilePath, parsers } from '../utils.js'

import type { ChildContext } from 'eslint-plugin-import-x'
import {
  countModuleSurface,
  getModuleSurface,
  isBarrelFileSurface,
  parse,
} from 'eslint-plugin-import-x/utils'

const jsContext = {
  settings: {},
  parserPath: parsers.ESPREE,
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
} as ChildContext

const tsContext = {
  settings: {},
  parserPath: parsers.TS,
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
} as ChildContext

function surfaceOf(code: string, context = jsContext) {
  const { ast } = parse('module.js', code, context)
  return countModuleSurface(ast.body)
}

describe(countModuleSurface, () => {
  it('counts top-level declarations and exported names', () => {
    expect(
      surfaceOf(`
        let foo
        export { foo }
        export const bar = 1
        export * from 'foo'
        export default { a: 1, b: 2 }
      `),
    ).toEqual({ exports: 5, declarations: 2 })
  })

  it('counts named re-exports as exports only', () => {
    expect(surfaceOf("export { a, b } from 'foo'")).toEqual({
      exports: 2,
      declarations: 0,
    })
  })

  it('counts inline exported declarations', () => {
    expect(surfaceOf('export function foo() {}')).toEqual({
      exports: 1,
      declarations: 1,
    })
    expect(surfaceOf('export class Foo {}')).toEqual({
      exports: 1,
      declarations: 1,
    })
    expect(surfaceOf('export type Foo = string', tsContext)).toEqual({
      exports: 1,
      declarations: 1,
    })
    expect(surfaceOf('export interface Foo {}', tsContext)).toEqual({
      exports: 1,
      declarations: 1,
    })
  })

  it('ignores type-only export-all declarations', () => {
    expect(surfaceOf("export type * from 'foo'", tsContext)).toEqual({
      exports: 0,
      declarations: 0,
    })
  })

  it('treats default-exported classes as declarations', () => {
    expect(surfaceOf('export default class Foo {}')).toEqual({
      exports: 0,
      declarations: 1,
    })
  })

  it('counts TypeScript enum, namespace and declare-function declarations', () => {
    expect(surfaceOf('export enum Foo { A, B }', tsContext)).toEqual({
      exports: 1,
      declarations: 1,
    })
    expect(surfaceOf('export namespace Foo {}', tsContext)).toEqual({
      exports: 1,
      declarations: 1,
    })
    expect(surfaceOf('export declare function foo(): void', tsContext)).toEqual(
      {
        exports: 1,
        declarations: 1,
      },
    )
  })

  it('does not mistake a module of TS declarations for a barrel', () => {
    expect(
      surfaceOf(
        `
          enum A {}
          enum B {}
          enum C {}
          enum D {}
          export { A, B, C, D }
        `,
        tsContext,
      ),
    ).toEqual({ exports: 4, declarations: 4 })
  })

  it('counts nothing for an export-import alias it cannot attribute', () => {
    expect(surfaceOf('export import Foo = require("foo")', tsContext)).toEqual({
      exports: 0,
      declarations: 0,
    })
  })
})

describe(isBarrelFileSurface, () => {
  it('is a barrel when exports outnumber declarations past the threshold', () => {
    expect(isBarrelFileSurface({ exports: 4, declarations: 0 }, 3)).toBe(true)
  })

  it('is not a barrel when exports do not outnumber declarations', () => {
    expect(isBarrelFileSurface({ exports: 4, declarations: 4 }, 3)).toBe(false)
  })

  it('is not a barrel at the threshold', () => {
    expect(isBarrelFileSurface({ exports: 3, declarations: 0 }, 3)).toBe(false)
  })
})

describe(getModuleSurface, () => {
  it('returns null when the file cannot be statted', () => {
    expect(
      getModuleSurface(testFilePath('barrel-files/nope.js'), jsContext),
    ).toBeNull()
  })

  it('returns null when the file cannot be parsed', () => {
    expect(
      getModuleSurface(
        testFilePath('barrel-files/invalid-syntax.js'),
        jsContext,
      ),
    ).toBeNull()
  })

  it('returns the surface and serves repeated lookups from cache', () => {
    const path = testFilePath('barrel-files/barrel.js')
    const first = getModuleSurface(path, jsContext)

    expect(first).toEqual({ exports: 4, declarations: 0 })
    expect(getModuleSurface(path, jsContext)).toBe(first)
  })
})
