import { testContext } from '../utils.js'

import { ModuleInfo } from 'eslint-plugin-import-x/core/index'
import type { LexedEsModule } from 'eslint-plugin-import-x/core/module-lexer'
import { lexModule } from 'eslint-plugin-import-x/core/module-lexer'
import type { RuleContext } from 'eslint-plugin-import-x/types'
import { ExportMap } from 'eslint-plugin-import-x/utils'

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
    expect(result.namespaceReexports).toEqual([
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
    // 1-based line of the specifier string literal
    expect(bySpecifier.get('./a.js')!.loc.start.line).toBe(2)
    expect(bySpecifier.get('./dyn.js')!.loc.start.line).toBe(9)
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
    expect(moduleInfo.parseGoal).toBe('Module')
    // lexed analyses carry no parse artifacts
    expect(moduleInfo.visitorKeys).toBeNull()
    expect(moduleInfo.errors).toHaveLength(0)

    // own exports
    expect(moduleInfo.hasExport('foo')).toBe(true)
    expect(moduleInfo.hasDefaultExport).toBe(true)
    expect(moduleInfo.hasOwnExport('foo')).toBe(true)
    expect(moduleInfo.hasExplicitExport('foo')).toBe(true)
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
    const deep = moduleInfo.resolveDeepExport('renamedHelper')
    expect(deep.found).toBe(true)
    expect(deep.path).toEqual([
      expect.stringContaining('lexed-esm/index.js'),
      expect.stringContaining('lexed-esm/util.js'),
    ])
  })

  it('resolves namespace re-exports lazily through the core dispatch', () => {
    const moduleInfo = ModuleInfo.get('lexed-esm', fakeContext)!
    const ns = moduleInfo.getExport('ns')!
    expect(ns).toBeDefined()
    const nsModule = ns.namespace!
    expect(nsModule).toBeDefined()
    expect(nsModule.hasExport('helper')).toBe(true)
    // the namespace target was itself analyzed by the lexer
    expect(nsModule.visitorKeys).toBeNull()
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
    expect(imports.get(utilPath)!.resolve()!.hasExport('helper')).toBe(true)

    const starPaths = moduleInfo.getStarExportPaths()
    expect(starPaths).toEqual([expect.stringContaining('star.js')])
  })

  it('keeps CommonJS modules invisible (parity with the AST route)', () => {
    expect(ModuleInfo.get('lexed-cjs', fakeContext)).toBeNull()
  })

  it('marks dynamic-import-only modules as ambiguous', () => {
    const moduleInfo = ModuleInfo.get('lexed-dynamic', fakeContext)!
    expect(moduleInfo).toBeDefined()
    expect(moduleInfo.parseGoal).toBe('ambiguous')
    expect(moduleInfo.getOwnExportNames()).toEqual([])
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

  it('leaves ExportMap untouched — direct consumers still get a full parse', () => {
    const exportMap = ExportMap.get('lexed-esm', fakeContext)!
    expect(exportMap).toBeDefined()
    // a real parse happened: parse artifacts exist
    expect(exportMap.visitorKeys).not.toBeNull()
    expect(exportMap.has('foo')).toBe(true)
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
    // tier 1 is lexed
    expect(moduleInfo.visitorKeys).toBeNull()

    const moduleDoc = moduleInfo.getModuleDoc()
    expect(moduleDoc).toBeDefined()
    expect(moduleDoc!.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: 'deprecated' }),
        expect.objectContaining({ tag: 'module' }),
      ]),
    )

    const exportDoc = moduleInfo.getExportDoc('foo')
    expect(exportDoc).toBeDefined()
    expect(exportDoc!.tags[0]).toMatchObject({
      tag: 'deprecated',
      description: 'Do not use foo.',
    })

    // names without docs stay undefined
    expect(moduleInfo.getExportDoc('nonexistent')).toBeUndefined()

    // escalation does not change tier-1 behavior
    expect(moduleInfo.hasExport('starExported')).toBe(true)
  })
})
