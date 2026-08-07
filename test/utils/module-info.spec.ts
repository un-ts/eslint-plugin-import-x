import fs from 'node:fs'
import { setTimeout } from 'node:timers/promises'

import { jest } from '@jest/globals'

import { isESLint10, testContext, testFilePath } from '../utils.js'

import {
  getExportDoc,
  getModuleDoc,
  ModuleInfo,
} from 'eslint-plugin-import-x/core/index'
import type { RuleContext } from 'eslint-plugin-import-x/types'
import { isMaybeUnambiguousModule } from 'eslint-plugin-import-x/utils'

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
