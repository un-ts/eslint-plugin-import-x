import path from 'node:path'

import { testContext } from '../utils.js'

import {
  getDefaultExportSourceName,
  getExportDoc,
  getModuleDoc,
  getModuleFormat,
  getOwnExportNames,
  getStarExportPaths,
  hasDefaultExport,
  hasExplicitExport,
  hasOwnExport,
  ModuleInfo,
  resolveDeepExport,
} from 'eslint-plugin-import-x/core/index'
import type { LexedEsModule } from 'eslint-plugin-import-x/core/module-lexer'
import { lexModule } from 'eslint-plugin-import-x/core/module-lexer'
import type { RuleContext } from 'eslint-plugin-import-x/types'

describe('lexModule', () => {
  it('classifies an ES module and extracts its shape', () => {
    const result = lexModule(
      `
import a from './a.js'
import './side-effect.js'
export const own = 1
export default function foo() {}
export { helper as renamed, plain } from './b.js'
export * from './c.js'
export * as ns from './d.js'
const p = import('./dyn.js')
`,
      'test.js',
    ) as LexedEsModule

    expect(result.format).toBe('module')
    expect(result.ownExports.sort()).toEqual(['default', 'own'])
    expect(result.reexports).toEqual([
      { exported: 'renamed', local: 'helper', specifier: './b.js' },
      { exported: 'plain', local: 'plain', specifier: './b.js' },
    ])
    expect(result.namespaceExports).toEqual([
      { exported: 'ns', specifier: './d.js' },
    ])

    const bySpecifier = new Map(result.imports.map(i => [i.specifier, i]))
    // `export * as ns from './d.js'` must NOT produce an import edge (parity
    // with the AST path)
    expect(bySpecifier.has('./d.js')).toBe(false)
    expect(bySpecifier.get('./a.js')).toMatchObject({
      dynamic: false,
      starReexport: false,
    })
    expect(bySpecifier.get('./side-effect.js')).toMatchObject({
      dynamic: false,
    })
    expect(bySpecifier.get('./b.js')).toMatchObject({ starReexport: false })
    expect(bySpecifier.get('./c.js')).toMatchObject({ starReexport: true })
    expect(bySpecifier.get('./dyn.js')).toMatchObject({ dynamic: true })
    // 1-based line, 0-based column of the specifier string literal, quotes
    // included — exactly the range a `Literal` node's own `loc` covers
    expect(bySpecifier.get('./a.js')!.loc).toEqual({
      start: { line: 2, column: 14 },
      end: { line: 2, column: 22 },
    })
    // `const p = import('./dyn.js')` — the opening quote is column 17, not
    // the `(` at 16: a dynamic specifier's offsets already include quotes
    expect(bySpecifier.get('./dyn.js')!.loc).toEqual({
      start: { line: 9, column: 17 },
      end: { line: 9, column: 27 },
    })
  })

  it('recognizes a re-exported namespace import as a namespace export', () => {
    const result = lexModule(
      `
import * as b from './b.js'
import d, * as combined from './d.js'
import plainDefault from './p.js'
export { b, combined as renamedNs, plainDefault }
export default b
`,
      'test.js',
    ) as LexedEsModule

    // es-module-lexer reports these as ordinary own exports; only the join
    // against `import * as` bindings reveals they are namespace objects
    expect(result.namespaceExports).toEqual(
      expect.arrayContaining([
        { exported: 'b', specifier: './b.js' },
        { exported: 'renamedNs', specifier: './d.js' },
        { exported: 'default', specifier: './b.js' },
      ]),
    )
    // a non-namespace binding stays an ordinary own export
    expect(result.ownExports).toEqual(['plainDefault'])
  })

  it('falls back to the AST route for type-only imports', () => {
    // es-module-lexer accepts all three without complaint, but they bind
    // nothing at runtime — treating them as value imports invents edges
    expect(
      lexModule(`import type { T } from './t.js'\nexport const x = 1`, 'f.js'),
    ).toBeNull()
    expect(
      lexModule(`import typeof T from './t.js'\nexport const x = 1`, 'f.js'),
    ).toBeNull()
    expect(
      lexModule(
        `import { type T, v } from './t.js'\nexport const x = 1`,
        'f.js',
      ),
    ).toBeNull()
  })

  it('falls back to the AST route for stage-1 export-from syntax', () => {
    // es-module-lexer reports no import edge at all for these, so the module
    // link would silently vanish
    expect(
      lexModule(`export default from './named-exports.js'`, 'f.js'),
    ).toBeNull()
    expect(lexModule(`export baz from './named-exports.js'`, 'f.js')).toBeNull()
  })

  it('keeps standard export-from syntax on the lexer route', () => {
    // guards the stage-1 detector against over-matching
    expect(lexModule(`export { baz } from './x.js'`, 'f.js')).toMatchObject({
      format: 'module',
    })
    expect(lexModule(`export * from './x.js'`, 'f.js')).toMatchObject({
      format: 'module',
    })
    expect(
      lexModule(`const from = 1\nexport default from`, 'f.js'),
    ).toMatchObject({ format: 'module' })
  })

  it('classifies star exports with comments in the statement', () => {
    const result = lexModule(
      `export /* comment */ * from './c.js'`,
      'test.js',
    ) as LexedEsModule
    expect(result.format).toBe('module')
    expect(result.imports[0]).toMatchObject({
      specifier: './c.js',
      starReexport: true,
    })
  })

  it('classifies CommonJS as a script, with cjs-module-lexer exports', () => {
    const result = lexModule(`exports.a = 1\nmodule.exports.b = 2\n`, 'test.js')
    expect(result).toMatchObject({ format: 'script' })
    expect((result as { exports: string[] }).exports).toEqual(
      expect.arrayContaining(['a', 'b']),
    )
  })

  it('classifies dynamic-import-only files as ambiguous', () => {
    const result = lexModule(
      `const load = () => import('./lazy.js')`,
      'test.js',
    ) as LexedEsModule
    expect(result.format).toBe('ambiguous')
    expect(result.ownExports).toEqual([])
    expect(result.imports).toEqual([
      expect.objectContaining({ specifier: './lazy.js', dynamic: true }),
    ])
  })

  it('treats an import.meta-only file as a script (parity with the AST path)', () => {
    const result = lexModule(`console.log(import.meta.url)`, 'test.js')
    expect(result).toMatchObject({ format: 'script' })
  })

  it('returns null when the lexers cannot handle the file', () => {
    // JSX is not lexable — the caller must fall back to the AST route
    expect(lexModule(`export default <div>hi</div>`, 'test.jsx')).toBeNull()
  })
})

describe('core lexer fast path for external modules', () => {
  const fakeContext = {
    ...testContext(),
    parserPath: 'espree',
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  } as RuleContext

  it('analyzes external ES modules without a parser', () => {
    const moduleInfo = ModuleInfo.get('lexed-esm', fakeContext)!
    expect(moduleInfo).toBeDefined()
    expect(getModuleFormat(moduleInfo)).toBe('Module')
    expect(moduleInfo.parseError).toBeUndefined()

    // own exports
    expect(moduleInfo.hasExport('foo')).toBe(true)
    expect(hasDefaultExport(moduleInfo)).toBe(true)
    expect(hasOwnExport(moduleInfo, 'foo')).toBe(true)
    expect(hasExplicitExport(moduleInfo, 'foo')).toBe(true)
    // named re-exports (with alias recovery)
    expect(moduleInfo.hasExport('renamedHelper')).toBe(true)
    expect(moduleInfo.hasExport('plain')).toBe(true)
    // `export * from` expansion
    expect(moduleInfo.hasExport('starExported')).toBe(true)
    // `export * as ns from`
    expect(moduleInfo.hasExport('ns')).toBe(true)
    expect(moduleInfo.hasExport('nonexistent')).toBe(false)
    expect(moduleInfo.hasExports).toBe(true)
  })

  it('resolves deep re-export chains through lexed modules', () => {
    const moduleInfo = ModuleInfo.get('lexed-esm', fakeContext)!
    const deep = resolveDeepExport(moduleInfo, 'renamedHelper')
    expect(deep.found).toBe(true)
    expect(deep.path).toEqual([
      expect.stringContaining(path.join('lexed-esm', 'index.js')),
      expect.stringContaining(path.join('lexed-esm', 'util.js')),
    ])
  })

  it('resolves namespace re-exports lazily through the core dispatch', () => {
    const moduleInfo = ModuleInfo.get('lexed-esm', fakeContext)!
    const ns = moduleInfo.getExport('ns')!
    expect(ns).toBeDefined()
    const nsModule = ns.getNamespace?.()
    expect(nsModule).toBeDefined()
    expect(nsModule!.hasExport('helper')).toBe(true)
  })

  it('records import edges with locations and star-export targets', () => {
    const moduleInfo = ModuleInfo.get('lexed-esm', fakeContext)!
    const imports = moduleInfo.getImports()
    const utilPath = [...imports.keys()].find(p => p.endsWith('util.js'))!
    expect(utilPath).toBeDefined()
    const declarations = [...imports.get(utilPath)!.declarations]
    // `import util from './util.js'` + `export { ... } from './util.js'`;
    // `export * as ns from './util.js'` adds no edge
    expect(declarations).toHaveLength(2)
    expect(declarations[0].source.loc.start.line).toBeGreaterThan(0)

    // No lexer reports what a statement binds, so reading `imported`
    // escalates to a one-off AST parse of this file, joined on specifier
    // location. Keyed by line: `import util from './util.js'` is line 5,
    // `export { helper as renamedHelper, plain } from './util.js'` is line 14.
    const byLine = new Map(declarations.map(d => [d.source.loc.start.line, d]))
    expect([...byLine.keys()].sort((a, b) => a - b)).toEqual([5, 14])
    expect(byLine.get(5)!.imported).toEqual({
      names: new Set(),
      default: true,
      namespace: false,
    })
    expect(byLine.get(14)!.imported).toEqual({
      names: new Set(),
      default: false,
      namespace: false,
    })
    expect(imports.get(utilPath)!.resolve()!.hasExport('helper')).toBe(true)

    const starPaths = getStarExportPaths(moduleInfo)
    expect(starPaths).toEqual([expect.stringContaining('star.js')])
  })

  it('keeps CommonJS modules invisible (parity with the AST route)', () => {
    expect(ModuleInfo.get('lexed-cjs', fakeContext)).toBeNull()
  })

  it('marks dynamic-import-only modules as ambiguous', () => {
    const moduleInfo = ModuleInfo.get('lexed-dynamic', fakeContext)!
    expect(moduleInfo).toBeDefined()
    expect(getModuleFormat(moduleInfo)).toBe('ambiguous')
    expect(getOwnExportNames(moduleInfo)).toEqual([])
    const declarations = [...moduleInfo.getImports().values()].flatMap(v => [
      ...v.declarations,
    ])
    expect(declarations).toEqual([expect.objectContaining({ dynamic: true })])
  })

  it('returns the same instance on subsequent requests', () => {
    expect(ModuleInfo.get('lexed-esm', fakeContext)).toBe(
      ModuleInfo.get('lexed-esm', fakeContext),
    )
  })

  it('derives the default export source name without a parser', () => {
    const moduleInfo = ModuleInfo.get('lexed-esm', fakeContext)!
    expect(getDefaultExportSourceName(moduleInfo)).toEqual({
      name: 'mainThing',
      isBoundName: false,
    })
  })

  it('derives bound and unnameable default exports like the AST route', () => {
    const cases: Array<[string, unknown]> = [
      ['export default function foo() {}', { name: 'foo', isBoundName: false }],
      ['export default class Foo {}', { name: 'Foo', isBoundName: false }],
      [
        'const x = 1; export { x as default }',
        { name: 'x', isBoundName: false },
      ],
      ['const foo = 1; export default foo', { name: 'foo', isBoundName: true }],
      ['export default Foo = 1', { name: 'Foo', isBoundName: true }],
      [
        'const F = 1; export default withHoc(F)',
        { name: 'F', isBoundName: true },
      ],
      ['export default { a: 1 }', undefined],
      ['export default () => {}', undefined],
      ['export default foo => foo', undefined],
      ['export default new Foo()', undefined],
    ]
    for (const [source, expected] of cases) {
      const result = lexModule(source, 'test.js') as LexedEsModule
      expect(result.defaultExportSourceName).toEqual(expected)
    }
  })
})

describe('ModuleInfo tier-2 escalation for lexed modules', () => {
  const fakeContext = {
    ...testContext(),
    parserPath: 'espree',
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  } as RuleContext

  it('escalates doc queries to a full parse', () => {
    const moduleInfo = ModuleInfo.get('lexed-esm', fakeContext)!

    const moduleDoc = getModuleDoc(moduleInfo)
    expect(moduleDoc).toBeDefined()
    expect(moduleDoc!.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'deprecated' }),
        expect.objectContaining({ tag: 'module' }),
      ]),
    )

    const exportDoc = getExportDoc(moduleInfo, 'foo')
    expect(exportDoc).toBeDefined()
    expect(exportDoc!.tags[0]).toMatchObject({
      tag: 'deprecated',
      description: 'Do not use foo.',
    })

    // names without docs stay undefined
    expect(getExportDoc(moduleInfo, 'nonexistent')).toBeUndefined()

    // escalation does not change tier-1 behavior
    expect(moduleInfo.hasExport('starExported')).toBe(true)
  })
})
