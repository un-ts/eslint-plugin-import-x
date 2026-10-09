import fs from 'node:fs'

import { testContext, testFilePath, parsers } from '../utils.js'

import type { ChildContext } from 'eslint-plugin-import-x'
import { analyzeAstModule } from 'eslint-plugin-import-x/core/ast-module'
import { ModuleInfo } from 'eslint-plugin-import-x/core/index'
import type { RuleContext } from 'eslint-plugin-import-x/types'
import {
  countModuleSurface,
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
    // type-only declarations are erased, so they add no runtime export
    expect(surfaceOf('export type Foo = string', tsContext)).toEqual({
      exports: 0,
      declarations: 1,
    })
    expect(surfaceOf('export interface Foo {}', tsContext)).toEqual({
      exports: 0,
      declarations: 1,
    })
  })

  it('ignores type-only named re-exports', () => {
    expect(surfaceOf("export type { A, B } from 'foo'", tsContext)).toEqual({
      exports: 0,
      declarations: 0,
    })
    // mixed: only the value specifier survives
    expect(surfaceOf("export { type A, B } from 'foo'", tsContext)).toEqual({
      exports: 1,
      declarations: 0,
    })
  })

  it('counts `export =` as an export', () => {
    expect(surfaceOf('import x = require("x")\nexport = x', tsContext)).toEqual(
      { exports: 1, declarations: 0 },
    )
  })

  it('ignores type-only export-all declarations', () => {
    expect(surfaceOf("export type * from 'foo'", tsContext)).toEqual({
      exports: 0,
      declarations: 0,
    })
  })

  it('counts a named default export as both a declaration and an export', () => {
    expect(surfaceOf('export default class Foo {}')).toEqual({
      exports: 1,
      declarations: 1,
    })
    expect(surfaceOf('export default function foo() {}')).toEqual({
      exports: 1,
      declarations: 1,
    })
  })

  it('counts TypeScript enums and namespaces as runtime declarations', () => {
    expect(surfaceOf('export enum Foo { A, B }', tsContext)).toEqual({
      exports: 1,
      declarations: 1,
    })
    expect(surfaceOf('export namespace Foo {}', tsContext)).toEqual({
      exports: 1,
      declarations: 1,
    })
  })

  it('treats declared functions as declarations only', () => {
    // `export declare function` is erased, so it exports nothing at runtime
    expect(surfaceOf('export declare function foo(): void', tsContext)).toEqual(
      {
        exports: 0,
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

  it('counts an export-import alias as a re-export', () => {
    expect(surfaceOf('export import Foo = require("foo")', tsContext)).toEqual({
      exports: 1,
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

describe(`ModuleInfo.exportCount`, () => {
  const parserOptions = { ecmaVersion: 'latest', sourceType: 'module' }
  const jsParserContext = {
    ...testContext(),
    parserPath: parsers.ESPREE,
    parserOptions,
  } as RuleContext
  // the overload fixture needs a parser that can read it when the surface is
  // escalated to, but stays on the lexer route
  const tsParserContext = {
    ...testContext(),
    parserPath: parsers.TS,
    parserOptions,
  } as RuleContext
  // forcing `.js` through an alternate parser keeps it off the lexer route
  const astRouteContext = {
    ...tsParserContext,
    settings: {
      ...tsParserContext.settings,
      'import-x/parsers': { [parsers.TS]: ['.js'] },
    },
  } as RuleContext

  it('adds up every export the lexer saw', () => {
    for (const [fixture, count] of [
      // 4 named re-exports
      ['barrel.js', 4],
      // 4 `export * from`
      ['star-barrel.js', 4],
      // one `export * from` whose target does not resolve
      ['unresolved-star.js', 1],
      // 4 `export * as ns from`
      ['ns-barrel.js', 4],
    ] as const) {
      const moduleInfo = ModuleInfo.get(
        `./barrel-files/${fixture}`,
        jsParserContext,
      )!
      expect(moduleInfo.exportCount).toBe(count)
    }
  })

  it('counts before the name map dedups, so overloads are not lost', () => {
    // three `export function f` overloads + two `export * from`: the surface
    // counts 5 exports, while the name map alone would see 3
    const moduleInfo = ModuleInfo.get(
      './barrel-files/overload-barrel.js',
      tsParserContext,
    )!
    expect(moduleInfo.exportCount).toBe(5)
    expect(moduleInfo.getSurface()).toEqual({ exports: 5, declarations: 3 })
  })

  it('is not set for an AST-analyzed module, which has the surface', () => {
    const moduleInfo = ModuleInfo.get(
      './barrel-files/overload-barrel.js',
      astRouteContext,
    )!
    expect(moduleInfo.exportCount).toBeUndefined()
    expect(moduleInfo.getSurface()).toEqual({ exports: 5, declarations: 3 })
  })
})

describe('ModuleInfo.getSurface', () => {
  const parserOptions = { ecmaVersion: 'latest', sourceType: 'module' }
  const jsParserContext = {
    ...testContext(),
    parserPath: parsers.ESPREE,
    parserOptions,
  } as RuleContext
  const tsParserContext = {
    ...testContext(),
    parserPath: parsers.TS,
    parserOptions,
  } as RuleContext
  // forcing `.js` through an alternate parser keeps it off the lexer route
  const astRouteContext = {
    ...jsParserContext,
    settings: {
      ...jsParserContext.settings,
      'import-x/parsers': { [parsers.ESPREE]: ['.js'] },
    },
  } as RuleContext

  it('computes the surface during the AST walk', () => {
    const filepath = testFilePath('barrel-files/barrel.js')
    const facts = analyzeAstModule(
      filepath,
      fs.readFileSync(filepath, 'utf8'),
      jsContext,
      false,
    )!
    expect(facts.surface).toEqual({ exports: 4, declarations: 0 })
  })

  it('serves the AST route the surface it already computed', () => {
    const moduleInfo = ModuleInfo.get(
      './barrel-files/barrel.js',
      astRouteContext,
    )!
    expect(moduleInfo.getSurface()).toEqual({ exports: 4, declarations: 0 })
    // the same object on every call — nothing is recomputed
    expect(moduleInfo.getSurface()).toBe(moduleInfo.getSurface())
  })

  it('escalates a lexer-analyzed module to the AST twin', () => {
    const moduleInfo = ModuleInfo.get(
      './barrel-files/barrel.js',
      jsParserContext,
    )!
    expect(moduleInfo.getSurface()).toEqual({ exports: 4, declarations: 0 })
    expect(moduleInfo.getSurface()).toBe(moduleInfo.getSurface())
  })

  it('counts TypeScript declarations through the configured parser', () => {
    const moduleInfo = ModuleInfo.get(
      './barrel-files/types.js',
      tsParserContext,
    )!
    expect(moduleInfo.getSurface()).toEqual({ exports: 1, declarations: 2 })
  })

  it('returns null when the module cannot be parsed', () => {
    const moduleInfo = ModuleInfo.get(
      './barrel-files/invalid-syntax.js',
      jsParserContext,
    )!
    expect(moduleInfo.getSurface()).toBeNull()
  })

  it('returns null when a lexer-analyzed module cannot be parsed', () => {
    // the lexer succeeded, so `getSurface` escalates — and the parser is
    // unusable, so the AST twin carries no surface
    const unusedParserContext = {
      ...testContext(),
      parserPath: 'not-real',
    } as RuleContext
    const moduleInfo = ModuleInfo.get(
      './barrel-files/barrel.js',
      unusedParserContext,
    )!
    expect(moduleInfo.getSurface()).toBeNull()
  })
})
