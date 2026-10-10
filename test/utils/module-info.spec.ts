import fs from 'node:fs'
import { setTimeout } from 'node:timers/promises'

import { jest } from '@jest/globals'

import { isESLint10, testContext, testFilePath } from '../utils.js'

import { analyzeAstModule } from 'eslint-plugin-import-x/core/ast-module'
import {
  getExportDoc,
  getExportNames,
  getModuleDoc,
  ModuleInfo,
  resolveDeepExport,
} from 'eslint-plugin-import-x/core/index'
import type { RuleContext } from 'eslint-plugin-import-x/types'
import {
  childContext,
  isMaybeUnambiguousModule,
} from 'eslint-plugin-import-x/utils'

const parserPath = isESLint10
  ? 'babel-eslint-parser-8-cjs'
  : '@babel/eslint-parser'

const espreeOptions = {
  parserPath: 'espree',
  parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
} as const

function deprecationDocTests(
  parserContext: Record<string, unknown>,
  lineEnding: '\n' | '\r\n',
) {
  const label = lineEnding === '\n' ? 'LF' : 'CRLF'
  const source = lineEnding === '\n' ? './deprecated' : './deprecated-crlf'

  describe(`deprecation docs (${label})`, () => {
    const context = { ...testContext(), ...parserContext } as RuleContext

    let moduleInfo: ModuleInfo

    beforeAll(() => {
      moduleInfo = ModuleInfo.get(source, context)!

      // sanity checks
      expect(moduleInfo).toBeDefined()
      expect(moduleInfo.parseError).toBeUndefined()
    })

    it('works with named imports', () => {
      expect(moduleInfo.hasExport('fn')).toBe(true)
      expect(getExportDoc(moduleInfo, 'fn')?.tags[0]).toMatchObject({
        tag: 'deprecated',
        description: "Please use 'x' instead.",
      })
    })

    it('works with default imports', () => {
      expect(moduleInfo.hasExport('default')).toBe(true)
      expect(getExportDoc(moduleInfo, 'default')?.tags[0]).toMatchObject({
        tag: 'deprecated',
        description: 'This is awful, use NotAsBadClass.',
      })
    })

    it('works with variables', () => {
      expect(moduleInfo.hasExport('MY_TERRIBLE_ACTION')).toBe(true)
      expect(
        getExportDoc(moduleInfo, 'MY_TERRIBLE_ACTION')?.tags[0],
      ).toMatchObject({
        tag: 'deprecated',
        description: 'Please stop sending/handling this action type.',
      })
    })

    describe('multi-line variables', () => {
      // `export const A = …, /** @deprecated */ B = …`: each declarator
      // carries its own doc
      for (const [name, description] of [
        ['CHAIN_A', 'This chain is awful'],
        ['CHAIN_B', 'So awful'],
        ['CHAIN_C', 'Still terrible'],
      ]) {
        it(`works for ${name}`, () => {
          expect(moduleInfo.hasExport(name)).toBe(true)
          expect(getExportDoc(moduleInfo, name)?.tags[0]).toMatchObject({
            tag: 'deprecated',
            description,
          })
        })
      }
    })

    it('has no deprecation for undocumented exports', () => {
      expect(moduleInfo.hasExport('_undocumented')).toBe(true)
      expect(getExportDoc(moduleInfo, '_undocumented')?.tags[0]?.tag).not.toBe(
        'deprecated',
      )
    })
  })
}

describe('ModuleInfo', () => {
  const fakeContext = {
    ...testContext(),
    parserPath,
  } as RuleContext

  it('handles `export * from`', () => {
    const moduleInfo = ModuleInfo.get('./export-all', fakeContext)!
    expect(moduleInfo).toBeDefined()
    expect(moduleInfo.hasExport('foo')).toBe(true)
    expect(moduleInfo.hasExports).toBe(true)

    // a re-export is a dependency too: the edge carries the direct import and
    // the `export * from` as two declarations of the same resolved path
    const edge = [...moduleInfo.getImports()].find(([p]) =>
      p.endsWith('sibling-with-names.js'),
    )
    expect(edge).toBeDefined()
    expect(edge![1].declarations.size).toBe(2)
  })

  it('records `export * as ns from` as a dependency on the AST route', () => {
    const filepath = testFilePath('namespace-reexport-ast.js')
    const astRouteContext = {
      ...fakeContext,
      // an alternate parser for `.js` keeps this off the lexer route, so the
      // AST route is what runs
      settings: {
        ...fakeContext.settings,
        'import-x/parsers': { [parserPath]: ['.js'] },
      },
    } as RuleContext
    try {
      fs.writeFileSync(filepath, "export * as ns from './named-exports'\n")
      const moduleInfo = ModuleInfo.get(
        './namespace-reexport-ast',
        astRouteContext,
      )!

      // the namespace export is retained, and its resolver is present and
      // still resolves the target (optional chaining alone would let a lost
      // `getNamespace` pass the not-null check)
      expect(moduleInfo.hasExport('ns')).toBe(true)
      const namespaceExport = moduleInfo.getExport('ns')
      expect(namespaceExport?.getNamespace).toBeInstanceOf(Function)
      expect(namespaceExport?.getNamespace?.()).not.toBeNull()

      // ...and the source module is an ordinary runtime dependency
      const edge = [...moduleInfo.getImports()].find(([p]) =>
        p.endsWith('named-exports.js'),
      )
      expect(edge).toBeDefined()
      const [declaration] = [...edge![1].declarations]
      expect(declaration.isOnlyImportingTypes).toBe(false)
    } finally {
      fs.rmSync(filepath, { force: true })
    }
  })

  it('keeps `export type * as ns from` type-only on the AST route', () => {
    const filepath = testFilePath('namespace-reexport-type.js')
    const tsParserPath = '@typescript-eslint/parser'
    const astRouteContext = {
      ...fakeContext,
      parserPath: tsParserPath,
      settings: {
        ...fakeContext.settings,
        'import-x/parsers': { [tsParserPath]: ['.js'] },
      },
    } as RuleContext
    try {
      fs.writeFileSync(filepath, "export type * as ns from './named-exports'\n")
      const moduleInfo = ModuleInfo.get(
        './namespace-reexport-type',
        astRouteContext,
      )!

      expect(moduleInfo.hasExport('ns')).toBe(true)
      const edge = [...moduleInfo.getImports()].find(([p]) =>
        p.endsWith('named-exports.js'),
      )
      expect(edge).toBeDefined()
      const [declaration] = [...edge![1].declarations]
      expect(declaration.isOnlyImportingTypes).toBe(true)
    } finally {
      fs.rmSync(filepath, { force: true })
    }
  })

  it('marks type-only named re-exports as type-only on the AST route', () => {
    const filepath = testFilePath('type-only-reexports.js')
    const tsParserPath = '@typescript-eslint/parser'
    const astRouteContext = {
      ...fakeContext,
      parserPath: tsParserPath,
      settings: {
        ...fakeContext.settings,
        'import-x/parsers': { [tsParserPath]: ['.js'] },
      },
    } as RuleContext
    try {
      fs.writeFileSync(
        filepath,
        [
          "export type { A } from './named-exports'",
          "export { type B, C } from './named-exports'",
          "export { type E } from './named-exports'",
          "export { D } from './named-exports'",
        ].join('\n'),
      )
      const moduleInfo = ModuleInfo.get(
        './type-only-reexports',
        astRouteContext,
      )!
      const edge = [...moduleInfo.getImports()].find(([p]) =>
        p.endsWith('named-exports.js'),
      )
      expect(edge).toBeDefined()
      expect(
        [...edge![1].declarations].map(d => d.isOnlyImportingTypes),
      ).toEqual([true, false, true, false])
    } finally {
      fs.rmSync(filepath, { force: true })
    }
  })

  it('returns a cached copy on subsequent requests', () => {
    expect(ModuleInfo.get('./named-exports', fakeContext)).toBe(
      ModuleInfo.get('./named-exports', fakeContext),
    )
  })

  it('does not return a cached copy if the parse is unreliable', () => {
    const mockContext = {
      ...fakeContext,
      parserPath: 'not-real',
      // an alternate parser declared for `.js` opts the file out of the
      // lexers, so this reaches the AST route — where an unusable parser
      // yields no visitor keys, and an unreliable parse must not be cached
      settings: {
        ...fakeContext.settings,
        'import-x/parsers': { 'not-real': ['.js'] },
      },
    } as RuleContext
    expect(ModuleInfo.get('./named-exports', mockContext)).toBeDefined()
    expect(ModuleInfo.get('./named-exports', mockContext)).not.toBe(
      ModuleInfo.get('./named-exports', mockContext),
    )
  })

  it('caches a lexable module even when the parser is unusable', () => {
    const mockContext = {
      ...fakeContext,
      parserPath: 'not-real',
    } as RuleContext
    // plain JS never reaches the parser, so the analysis does not depend on
    // one being loadable — unlike the AST route above, this is cacheable
    expect(ModuleInfo.get('./named-exports', mockContext)).toBe(
      ModuleInfo.get('./named-exports', mockContext),
    )
  })

  it('finds a dynamic import separated from its keyword by a comment', () => {
    // Guards the dynamic-import content prefilter in `ast-module.ts`. Only
    // trivia may sit between `import` and `(`, so the prefilter must tolerate
    // it — narrowing that regex to `/import\s*\(/` would silently make this
    // CommonJS file unanalyzable, losing the edge with no test failing.
    const filepath = testFilePath('dynamic-with-comment.js')
    const astRouteContext = {
      ...fakeContext,
      // an alternate parser for `.js` keeps this off the lexer route, so the
      // AST route (and its prefilter) is what runs
      settings: {
        ...fakeContext.settings,
        'import-x/parsers': { [parserPath]: ['.js'] },
      },
    } as RuleContext
    try {
      // static ESM syntax gets it past `isMaybeUnambiguousModule` (whose own
      // `import\(` alternative does *not* tolerate the comment), so what is
      // under test here is purely the dynamic-import prefilter
      fs.writeFileSync(
        filepath,
        'export const own = 1\nconst a = import /* c */ ("./named-exports")\n',
      )
      const moduleInfo = ModuleInfo.get(
        './dynamic-with-comment',
        astRouteContext,
      )
      expect(moduleInfo).not.toBeNull()
      expect(
        [...moduleInfo!.getImports().keys()].some(k =>
          k.endsWith(`named-exports.js`),
        ),
      ).toBe(true)
    } finally {
      fs.rmSync(filepath, { force: true })
    }
  })

  it('does not return a cached copy after modification', done => {
    const firstAccess = ModuleInfo.get('./mutator', fakeContext)
    expect(firstAccess).toBeDefined()

    // mutate (update modified time)
    const newDate = new Date()
    fs.utimes(testFilePath('mutator.js'), newDate, newDate, error => {
      expect(error).toBeFalsy()
      expect(ModuleInfo.get('./mutator', fakeContext)).not.toBe(firstAccess)
      done()
    })
  })

  it('re-analyzes a file that becomes a module', () => {
    const filepath = testFilePath('becomes-module.js')
    try {
      // a CommonJS script is unanalyzable to rules
      fs.writeFileSync(filepath, 'module.exports = 1\n')
      expect(ModuleInfo.get('./becomes-module', fakeContext)).toBeNull()

      // rewritten as ESM — the negative result must not stick, or a
      // long-running process (an editor server) would never see the change
      fs.writeFileSync(filepath, 'export const nowExported = 1\n')
      // bump the mtime explicitly: both writes can land in the same
      // millisecond, which would make the change invisible to the cache
      const later = new Date(Date.now() + 1000)
      fs.utimesSync(filepath, later, later)
      const reanalyzed = ModuleInfo.get('./becomes-module', fakeContext)
      expect(reanalyzed).not.toBeNull()
      expect(reanalyzed!.hasExport('nowExported')).toBe(true)
    } finally {
      fs.rmSync(filepath, { force: true })
    }
  })

  it('analyzes a file with a leading BOM identically to one without', () => {
    const plain = testFilePath('bom-plain.js')
    const withBom = testFilePath('bom-marked.js')
    const body = "import { a } from './named-exports.js'\nexport const y = a\n"
    try {
      fs.writeFileSync(plain, body)
      // ESLint strips the BOM before parsing, so leaving it on shifted every
      // lexer offset by one against the AST's and made es-module-lexer misread
      // the first statement — classifying the file as a script, or dropping its
      // import edge without a trace
      fs.writeFileSync(withBom, `\uFEFF${body}`)

      const shape = (source: string) => {
        const info = ModuleInfo.get(source, fakeContext)
        expect(info).not.toBeNull()
        return {
          exports: [...info!.ownExports.keys()],
          edges: [...info!.getImports()].map(([, imported]) =>
            [...imported.declarations].map(d => d.source.loc.start),
          ),
        }
      }

      expect(shape('./bom-marked')).toEqual(shape('./bom-plain'))
    } finally {
      fs.rmSync(plain, { force: true })
      fs.rmSync(withBom, { force: true })
    }
  })

  it('does not return a cached copy with different settings', () => {
    const firstAccess = ModuleInfo.get('./named-exports', fakeContext)
    expect(firstAccess).toBeDefined()

    const differentSettings = {
      ...fakeContext,
      parserPath: 'espree',
    }

    const result = ModuleInfo.get('./named-exports', differentSettings)
    expect(result).toBeDefined()
    expect(result).not.toBe(firstAccess)
  })

  it('does not throw for a missing file', () => {
    let moduleInfo
    expect(function () {
      moduleInfo = ModuleInfo.get('./does-not-exist', fakeContext)
    }).not.toThrow()

    expect(moduleInfo).toBeFalsy()
  })

  it('exports explicit names for a missing file in exports', () => {
    const moduleInfo = ModuleInfo.get('./exports-missing', fakeContext)!
    expect(moduleInfo).toBeDefined()
    expect(moduleInfo.hasExport('bar')).toBe(true)
  })

  it('finds exports for an ES7 module with @babel/eslint-parser', () => {
    const moduleInfo = ModuleInfo.get('./jsx/FooES7', fakeContext)!
    expect(moduleInfo).toBeDefined()
    expect(moduleInfo.parseError).toBeUndefined()
    expect(moduleInfo.getExport('default')).toBeDefined()
    expect(moduleInfo.hasExport('Bar')).toBe(true)
  })

  describe('deprecation metadata', () => {
    const crlfPath = testFilePath('deprecated-crlf.js')

    beforeAll(() => {
      const contents = fs.readFileSync(testFilePath('deprecated.js'), 'utf8')
      fs.writeFileSync(crlfPath, contents.replaceAll(/\r?\n/g, '\r\n'))
    })

    afterAll(done => fs.unlink(crlfPath, done))

    describe('default parser', () => {
      deprecationDocTests(espreeOptions, '\n')
      deprecationDocTests(espreeOptions, '\r\n')
    })

    describe('@babel/eslint-parser', () => {
      deprecationDocTests(
        {
          parserPath,
          parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
        },
        '\n',
      )
      deprecationDocTests(
        {
          parserPath,
          parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
        },
        '\r\n',
      )
    })

    it('has a module-level doc block', () => {
      const moduleInfo = ModuleInfo.get('./deprecated-file', {
        ...testContext(),
        ...espreeOptions,
      } as RuleContext)!
      expect(moduleInfo).toBeDefined()
      expect(getModuleDoc(moduleInfo)).toBeDefined()
    })
  })

  describe('exported static namespaces', () => {
    const espreeContext = { ...testContext(), ...espreeOptions } as RuleContext
    const babelContext = {
      ...testContext(),
      parserPath,
      parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
    } as RuleContext

    it('works with espree & traditional namespace exports', () => {
      const a = ModuleInfo.get('./deep/a', espreeContext)!
      expect(a.parseError).toBeUndefined()
      const b = a.getExport('b')?.getNamespace?.()
      expect(b).toBeDefined()
      expect(b!.hasExport('c')).toBe(true)
    })

    it('captures namespace exported as default', () => {
      const def = ModuleInfo.get('./deep/default', espreeContext)!
      expect(def.parseError).toBeUndefined()
      const namespace = def.getExport('default')?.getNamespace?.()
      expect(namespace).toBeDefined()
      expect(namespace!.hasExport('c')).toBe(true)
    })

    it('works with @babel/eslint-parser & ES7 namespace exports', () => {
      const a = ModuleInfo.get('./deep-es7/a', babelContext)!
      expect(a.parseError).toBeUndefined()
      const b = a.getExport('b')?.getNamespace?.()
      expect(b).toBeDefined()
      expect(b!.hasExport('c')).toBe(true)
    })
  })

  describe('deep namespace caching', () => {
    const espreeContext = { ...testContext(), ...espreeOptions } as RuleContext

    let a: ModuleInfo | null

    beforeAll(async () => {
      try {
        // first version
        await fs.promises.writeFile(
          testFilePath('deep/cache-2.js'),
          await fs.promises.readFile(testFilePath('deep/cache-2a.js')),
        )

        a = ModuleInfo.get('./deep/cache-1', espreeContext)
        expect(a).toBeDefined()
        expect(a!.parseError).toBeUndefined()

        expect(a!.getExport('b')?.getNamespace?.()?.hasExport('c')).toBe(true)

        // wait ~1s, cache check is 1s resolution
        await setTimeout(1100)
      } finally {
        await fs.promises.unlink(testFilePath('deep/cache-2.js'))
        // swap in a new file and touch it
        await fs.promises.writeFile(
          testFilePath('deep/cache-2.js'),
          await fs.promises.readFile(testFilePath('deep/cache-2b.js')),
        )
      }
    })

    it('works', () => {
      expect(a!.getExport('b')?.getNamespace?.()?.hasExport('c')).toBe(false)
    })

    afterAll(done => fs.unlink(testFilePath('deep/cache-2.js'), done))
  })

  it('scans for dynamic imports in linear time', () => {
    // a lazy block-comment pattern could stretch over later comments and, on
    // a failed match, retry every split of a comment run: ~4 s for 28 blocks
    const filepath = testFilePath('dynamic-import-hint.js')
    const content = `import /* polyfill */ './foo'\nfunction f() {}\n${'/** a */\n'.repeat(28)}export const z = 1\n`
    const start = performance.now()
    analyzeAstModule(
      filepath,
      content,
      childContext(filepath, fakeContext),
      false,
    )
    expect(performance.now() - start).toBeLessThan(1000)
  })

  describe('`export *` cycles', () => {
    // a.js and b.js `export *` from each other; self.js from itself
    it('finds names across the cycle', () => {
      const a = ModuleInfo.get('./cycles/star/a', fakeContext)!
      expect(a.hasExport('fromB')).toBe(true)
      expect(a.getExport('fromB')).toBeDefined()
      expect(resolveDeepExport(a, 'fromB').found).toBe(true)
    })

    it('terminates on a name the cycle does not export', () => {
      const a = ModuleInfo.get('./cycles/star/a', fakeContext)!
      expect(a.hasExport('missing')).toBe(false)
      expect(a.getExport('missing')).toBeUndefined()
      expect(resolveDeepExport(a, 'missing').found).toBe(false)
    })

    it('terminates when nothing in the cycle exports anything', () => {
      // empty-a.js and empty-b.js only `export *` from each other
      const empty = ModuleInfo.get('./cycles/star/empty-a', fakeContext)!
      expect(empty.hasExports).toBe(false)
    })

    it('collects each name once', () => {
      const a = ModuleInfo.get('./cycles/star/a', fakeContext)!
      expect([...getExportNames(a)].sort()).toEqual(['fromA', 'fromB'])
    })

    it('skips a module that `export *`s itself', () => {
      const self = ModuleInfo.get('./cycles/star/self', fakeContext)!
      expect(self.hasExport('own')).toBe(true)
      expect(self.getExport('missing')).toBeUndefined()
      expect(resolveDeepExport(self, 'missing').found).toBe(false)
      expect([...getExportNames(self)]).toEqual(['own'])
    })
  })

  describe('issue #210: self-reference', () => {
    it(`doesn't crash`, () => {
      expect(() => ModuleInfo.get('./narcissist', fakeContext)).not.toThrow(
        Error,
      )
    })
    it(`'hasExport' circular reference`, () => {
      const result = ModuleInfo.get('./narcissist', fakeContext)!
      expect(result).toBeDefined()
      expect(result.hasExport('soGreat')).toBe(true)
    })
    it(`can 'getExport' circular reference`, () => {
      const result = ModuleInfo.get('./narcissist', fakeContext)!
      expect(result).toBeDefined()
      expect(result.getExport('soGreat') != null).toBe(true)
    })
  })

  describe('issue #478: never parse non-whitelist extensions', () => {
    const context = {
      ...fakeContext,
      settings: { 'import-x/extensions': ['.js'] as const },
    }

    it('returns nothing for a TypeScript file', () => {
      expect(ModuleInfo.get('./typescript.ts', context)).toBeFalsy()
    })
  })

  describe('alternate parsers', () => {
    const context = {
      ...fakeContext,
      settings: {
        'import-x/extensions': ['.js'],
        'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      } as const,
    }

    jest.setTimeout(20e3) // takes a long time :shrug:

    const moduleInfo = ModuleInfo.get('./typescript.ts', context)!

    it('returns something for a TypeScript file', () => {
      expect(moduleInfo).toBeDefined()
    })

    it('has no parse errors', () => {
      expect(moduleInfo.parseError).toBeUndefined()
    })

    it('has exported function', () => {
      expect(moduleInfo.hasExport('getFoo')).toBe(true)
    })

    it('has exported typedef', () => {
      expect(moduleInfo.hasExport('MyType')).toBe(true)
    })

    it('has exported enum', () => {
      expect(moduleInfo.hasExport('MyEnum')).toBe(true)
    })

    it('has exported interface', () => {
      expect(moduleInfo.hasExport('Foo')).toBe(true)
    })

    it('has exported abstract class', () => {
      expect(moduleInfo.hasExport('Bar')).toBe(true)
    })

    it('caches ambiguous modules as unanalyzable', () => {
      const source = './typescript-declare-module.ts'
      expect(ModuleInfo.get(source, context)).toBeNull()
      expect(ModuleInfo.get(source, context)).toBeNull()
    })
  })

  // TODO: move to utils
  describe('unambiguous regex', () => {
    const testFiles = [
      ['deep/b.js', true],
      ['bar.js', true],
      ['deep-es7/b.js', true],
      ['common.js', false],
    ] as const

    for (const [testFile, expectedRegexResult] of testFiles) {
      it(`works for ${testFile} (${expectedRegexResult})`, () => {
        const content = fs.readFileSync(`./test/fixtures/${testFile}`, 'utf8')
        expect(isMaybeUnambiguousModule(content)).toBe(expectedRegexResult)
      })
    }
  })
})
