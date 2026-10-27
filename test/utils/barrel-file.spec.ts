import fs from 'node:fs'

import { testContext, testFilePath, parsers } from '../utils.js'

import type { ChildContext } from 'eslint-plugin-import-x'
import { analyzeAstModule } from 'eslint-plugin-import-x/core/ast-module'
import { ModuleInfo } from 'eslint-plugin-import-x/core/index'
import type { LexedEsModule } from 'eslint-plugin-import-x/core/module-lexer'
import { lexModule } from 'eslint-plugin-import-x/core/module-lexer'
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

const parserOptions = { ecmaVersion: 'latest', sourceType: 'module' }
const tsParserContext = {
  ...testContext(),
  parserPath: parsers.TS,
  parserOptions,
} as RuleContext

function surfaceOf(code: string, context = jsContext) {
  const { ast } = parse('module.js', code, context)
  return countModuleSurface(ast.body)
}

/**
 * Declarations the guard's bound has to survive, each also tried after a plain
 * `export const x = 1` — a construct the lexer mis-reads only shows up as an
 * undercount once the file has an export it *does* report.
 */
const trickyDeclarations: Array<[string, string]> = [
  // heads the lexer reads, which must stay on the fast path
  ['plain declarator list', 'export const a = 1, b = 2, c = 3'],
  ['declarators without initializers', 'export let a, b, c'],
  ['annotated declarator list', 'export const a: number = 1, b: number = 2'],
  [
    'overloads',
    'export function f(a: string): void\nexport function f(b: number): void',
  ],
  ['string export name', "export { a as 'string name' }"],
  ['export star', "export * from './a.js'"],
  ['export star as ns', "export * as ns from './a.js'"],
  ['async generator', 'export async function* g() {}'],
  ['class with type parameters', 'export class C<T> {}'],
  // destructuring declarators: the surface counts a declarator only when its
  // pattern names something, and the lexer reports every bound name
  ['renamed destructuring', 'export const { a: b, c: d } = obj'],
  ['array destructuring', 'export const [a, b] = arr'],
  ['computed key destructuring', 'export const { [key]: bound } = obj'],
  ['object rest', 'export const { a, ...rest } = obj'],
  ['object rest only', 'export const { ...rest } = obj'],
  ['array rest', 'export const [a, ...rest] = arr'],
  ['array rest only', 'export const [...rest] = arr'],
  ['defaulted binding', 'export const { a = 1 } = obj'],
  ['defaulted array element', 'export const [a = 1] = arr'],
  ['empty object pattern', 'export const {} = obj'],
  ['empty array pattern', 'export const [] = arr'],
  ['elided array pattern', 'export const [,,] = arr'],
  ['empty pattern after a binding', 'export const a = 1, {} = obj'],
  ['nested empty object pattern', 'export const { a: {} } = obj'],
  ['nested empty array pattern', 'export const [{}, []] = arr'],
  // a declaration can continue past a line break without a leading comma
  ['empty pattern on a continuation line', 'export const a = 1\n, {} = obj'],
  ['operator continuation', 'export const a = 1 +\n  2, {} = obj'],
  ['leading operator', 'export const a = 1\n  + 2, {} = obj'],
  ['member-access continuation', 'export const a = foo\n  .bar, {} = obj'],
  [
    'conditional continuation',
    'export const a = flag\n  ? one : two, {} = obj',
  ],
  ['call continuation', 'export const a = foo\n  (1), {} = obj'],
  // heads it does not read, which must bail to the AST route
  ['enum', 'export enum E { A }'],
  ['const enum', 'export const enum E { A }'],
  ['namespace', 'export namespace N {}'],
  ['module', 'export module M {}'],
  ['interface', 'export interface I { a: number }'],
  ['using', 'export using a = res'],
  ['await using', 'export await using b = res'],
  ['abstract class', 'export abstract class A {}'],
  ['declare function', 'export declare function f(x: number): void'],
  ['decorated class', 'export @dec class A {}'],
  ['type alias', 'export type T = number'],
  ['export assignment', 'export = x'],
]

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

  it('does not count a declarator that binds no name', () => {
    // a declarator is an export only once its pattern names something, which
    // is what keeps the lexer route's entry count an upper bound for
    // `export const {} = obj` without scanning the declaration
    for (const [source, surface] of [
      ['export const {} = obj', { exports: 0, declarations: 1 }],
      ['export const [] = arr', { exports: 0, declarations: 1 }],
      ['export const [,,] = arr', { exports: 0, declarations: 1 }],
      ['export const { a: {} } = obj', { exports: 0, declarations: 1 }],
      ['export const [{}, []] = arr', { exports: 0, declarations: 1 }],
      ['export const a = 1, {} = obj', { exports: 1, declarations: 2 }],
      ['export const { a, b } = obj', { exports: 1, declarations: 1 }],
      ['export const [a] = arr', { exports: 1, declarations: 1 }],
    ] as Array<[string, { exports: number; declarations: number }]>) {
      expect({ source, surface: surfaceOf(source) }).toEqual({
        source,
        surface,
      })
    }
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

describe('ModuleInfo.getSurface', () => {
  const jsParserContext = {
    ...testContext(),
    parserPath: parsers.ESPREE,
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

describe('ModuleInfo.exportCount', () => {
  // forcing `.js` through an alternate parser keeps it off the lexer route
  const astRouteContext = {
    ...tsParserContext,
    settings: {
      ...tsParserContext.settings,
      'import-x/parsers': { [parsers.TS]: ['.js'] },
    },
  } as RuleContext

  it('counts every runtime export entry the lexer reported', () => {
    const counts: Record<string, number | undefined> = {}
    for (const fixture of [
      // 4 named re-exports
      'barrel.js',
      // 4 `export * from`
      'star-barrel.js',
      // 4 `export * as ns from`
      'ns-barrel.js',
      // three overloads of one name (the surface counts each) + 2 stars
      'overload-barrel.js',
    ]) {
      counts[fixture] = ModuleInfo.get(
        `./barrel-files/${fixture}`,
        tsParserContext,
      )!.exportCount
    }
    expect(counts).toEqual({
      'barrel.js': 4,
      'star-barrel.js': 4,
      'ns-barrel.js': 4,
      'overload-barrel.js': 5,
    })
  })

  it('is not set for an AST-analyzed module, which has the surface', () => {
    const moduleInfo = ModuleInfo.get(
      './barrel-files/barrel.js',
      astRouteContext,
    )!
    expect(moduleInfo.exportCount).toBeUndefined()
    expect(moduleInfo.getSurface()).toEqual({ exports: 4, declarations: 0 })
  })

  it('stays an upper bound on the surface it lets the guard skip', () => {
    // The guard skips `getSurface()` when this count is at or below the
    // threshold, so it must never be smaller than what the surface would count.
    // Anything the lexer reads unfaithfully has to bail instead, and a module
    // with a default export is never ruled out (its `export default { … }`
    // properties are invisible to any entry count).
    const undercounts: Array<[string, number, number]> = []
    for (const [label, declaration] of trickyDeclarations) {
      for (const [variant, code] of [
        ['', declaration],
        [' after a readable export', `export const x = 1\n${declaration}`],
      ] as const) {
        const lexed = lexModule(code, 'f.js') as LexedEsModule | null
        if (lexed == null || lexed.ownExports.includes('default')) {
          continue
        }
        const count =
          lexed.ownExports.length +
          lexed.namespaceExports.length +
          lexed.reexports.length +
          lexed.imports.filter(imp => imp.starReexport).length
        const exact = surfaceOf(code, tsContext).exports
        if (count < exact) {
          undercounts.push([`${label}${variant}`, count, exact])
        }
      }
    }
    expect(undercounts).toEqual([])
  })
})

describe('ModuleInfo.hasSourceDefaultExport', () => {
  // forcing `.js` through an alternate parser keeps it off the lexer route
  const astRouteContext = {
    ...tsParserContext,
    settings: {
      ...tsParserContext.settings,
      'import-x/parsers': { [parsers.TS]: ['.js'] },
    },
  } as RuleContext

  it('follows the source, not what `esModuleInterop` synthesizes', () => {
    // the fact exists so the guard can tell a source default from the one
    // `esModuleInterop` adds for every module that exports anything
    for (const context of [tsParserContext, astRouteContext]) {
      expect(
        ModuleInfo.get('./barrel-files/barrel.js', context)!
          .hasSourceDefaultExport,
      ).toBe(false)
      expect(
        ModuleInfo.get(testFilePath('default-export.js'), context)!
          .hasSourceDefaultExport,
      ).toBe(true)
    }
  })

  it('is false when `esModuleInterop` is the only source of the default', () => {
    const tsconfigContext = {
      ...tsParserContext,
      languageOptions: {
        parserOptions: {
          tsconfigRootDir: testFilePath('typescript-export-assign-type'),
        },
      },
    } as RuleContext
    const moduleInfo = ModuleInfo.get(
      './barrel-files/not-barrel.js',
      tsconfigContext,
    )!
    // the compiler option adds the binding…
    expect(moduleInfo.ownExports.has('default')).toBe(true)
    // …but the source declares no default, so the guard may still rule it out
    expect(moduleInfo.hasSourceDefaultExport).toBe(false)
  })
})
