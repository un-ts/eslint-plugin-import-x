import fs from 'node:fs'
import { setTimeout } from 'node:timers/promises'

import { jest } from '@jest/globals'
import * as getTsconfig from 'get-tsconfig'

import { testContext, testFilePath } from '../utils.js'

import type { ChildContext } from 'eslint-plugin-import-x'
import {
  ExportMap,
  isMaybeUnambiguousModule,
} from 'eslint-plugin-import-x/utils'

function jsdocTests(parseContext: ChildContext, lineEnding: string) {
  describe('deprecated imports', () => {
    const path = testFilePath('deprecated.js')
    const contents = fs
      .readFileSync(path, { encoding: 'utf8' })
      .replaceAll(/\r?\n/g, lineEnding)

    let imports: ExportMap

    beforeAll(() => {
      imports = ExportMap.parse(path, contents, parseContext)!

      // sanity checks
      expect(imports.errors).toHaveLength(0)
    })

    it('works with named imports.', () => {
      expect(imports.has('fn')).toBe(true)

      expect(imports.get('fn')).toHaveProperty('doc.tags[0].tag', 'deprecated')
      expect(imports.get('fn')).toHaveProperty(
        'doc.tags[0].description',
        "Please use 'x' instead.",
      )
    })

    it('works with default imports.', () => {
      expect(imports.has('default')).toBe(true)
      const importMeta = imports.get('default')

      expect(importMeta).toHaveProperty('doc.tags[0].tag', 'deprecated')
      expect(importMeta).toHaveProperty(
        'doc.tags[0].description',
        'This is awful, use NotAsBadClass.',
      )
    })

    it('works with variables.', () => {
      expect(imports.has('MY_TERRIBLE_ACTION')).toBe(true)
      const importMeta = imports.get('MY_TERRIBLE_ACTION')

      expect(importMeta).toHaveProperty('doc.tags[0].tag', 'deprecated')
      expect(importMeta).toHaveProperty(
        'doc.tags[0].description',
        'Please stop sending/handling this action type.',
      )
    })

    describe('multi-line variables', () => {
      it('works for the first one', () => {
        expect(imports.has('CHAIN_A')).toBe(true)
        const importMeta = imports.get('CHAIN_A')

        expect(importMeta).toHaveProperty('doc.tags[0].tag', 'deprecated')
        expect(importMeta).toHaveProperty(
          'doc.tags[0].description',
          'This chain is awful',
        )
      })
      it('works for the second one', () => {
        expect(imports.has('CHAIN_B')).toBe(true)
        const importMeta = imports.get('CHAIN_B')

        expect(importMeta).toHaveProperty('doc.tags[0].tag', 'deprecated')
        expect(importMeta).toHaveProperty('doc.tags[0].description', 'So awful')
      })
      it('works for the third one, etc.', () => {
        expect(imports.has('CHAIN_C')).toBe(true)
        const importMeta = imports.get('CHAIN_C')

        expect(importMeta).toHaveProperty('doc.tags[0].tag', 'deprecated')
        expect(importMeta).toHaveProperty(
          'doc.tags[0].description',
          'Still terrible',
        )
      })
    })
  })

  describe('full module', () => {
    const path = testFilePath('deprecated-file.js')
    const contents = fs.readFileSync(path, { encoding: 'utf8' })

    let imports: ExportMap

    beforeAll(() => {
      imports = ExportMap.parse(path, contents, parseContext)!

      // sanity checks
      expect(imports.errors).toHaveLength(0)
    })

    it('has JSDoc metadata', () => {
      expect(imports.doc).toBeDefined()
    })
  })
}

describe('ExportMap', () => {
  const fakeContext = {
    ...testContext(),
    parserPath: '@babel/eslint-parser',
  }

  it('handles ExportAllDeclaration', () => {
    const imports = ExportMap.get('./export-all', fakeContext)!
    expect(imports).toBeDefined()
    expect(imports.has('foo')).toBe(true)
  })

  it('returns a cached copy on subsequent requests', () => {
    expect(ExportMap.get('./named-exports', fakeContext)).toBe(
      ExportMap.get('./named-exports', fakeContext),
    )
  })

  it('does not return a cached copy if the parse does not yield a visitor keys', function () {
    const mockContext = {
      ...fakeContext,
      parserPath: 'not-real',
    }
    expect(ExportMap.get('./named-exports', mockContext)).toBeDefined()
    expect(ExportMap.get('./named-exports', mockContext)).not.toBe(
      ExportMap.get('./named-exports', mockContext),
    )
  })

  it('does not return a cached copy after modification', done => {
    const firstAccess = ExportMap.get('./mutator', fakeContext)
    expect(firstAccess).toBeDefined()

    // mutate (update modified time)
    const newDate = new Date()
    fs.utimes(testFilePath('mutator.js'), newDate, newDate, error => {
      expect(error).toBeFalsy()
      expect(ExportMap.get('./mutator', fakeContext)).not.toBe(firstAccess)
      done()
    })
  })

  it('does not return a cached copy with different settings', () => {
    const firstAccess = ExportMap.get('./named-exports', fakeContext)
    expect(firstAccess).toBeDefined()

    const differentSettings = {
      ...fakeContext,
      parserPath: 'espree',
    }

    const result = ExportMap.get('./named-exports', differentSettings)
    expect(result).toBeDefined()
    expect(result).not.toBe(firstAccess)
  })

  it('does not throw for a missing file', () => {
    let imports
    expect(function () {
      imports = ExportMap.get('./does-not-exist', fakeContext)
    }).not.toThrow()

    expect(imports).toBeFalsy()
  })

  it('exports explicit names for a missing file in exports', () => {
    const imports = ExportMap.get('./exports-missing', fakeContext)!
    expect(imports).toBeDefined()
    expect(imports.has('bar')).toBe(true)
  })

  it('finds exports for an ES7 module with @babel/eslint-parser', () => {
    const path = testFilePath('jsx/FooES7.js')
    const contents = fs.readFileSync(path, { encoding: 'utf8' })
    const imports = ExportMap.parse(path, contents, {
      parserPath: '@babel/eslint-parser',
      settings: {},
    } as ChildContext)!

    // imports
    expect(imports).toBeDefined()
    expect(imports.errors).toHaveLength(0)
    // default export
    expect(imports.get('default')).toBeDefined()
    expect(imports.has('Bar')).toBe(true)
  })

  describe('deprecation metadata', () => {
    describe('default parser', () => {
      jsdocTests(
        {
          parserPath: 'espree',
          parserOptions: {
            ecmaVersion: 2015,
            sourceType: 'module',
            // attachComment: true,
          },
          settings: {},
        } as ChildContext,
        '\n',
      )
      jsdocTests(
        {
          parserPath: 'espree',
          parserOptions: {
            ecmaVersion: 2015,
            sourceType: 'module',
            // attachComment: true,
          },
          settings: {},
        } as ChildContext,
        '\r\n',
      )
    })

    describe('@babel/eslint-parser', () => {
      jsdocTests(
        {
          parserPath: '@babel/eslint-parser',
          parserOptions: {
            ecmaVersion: 2015,
            sourceType: 'module',
            // attachComment: true,
          },
          settings: {},
        } as ChildContext,
        '\n',
      )
      jsdocTests(
        {
          parserPath: '@babel/eslint-parser',
          parserOptions: {
            ecmaVersion: 2015,
            sourceType: 'module',
            // attachComment: true,
          },
          settings: {},
        } as ChildContext,
        '\r\n',
      )
    })
  })

  describe('exported static namespaces', () => {
    const espreeContext = {
      parserPath: 'espree',
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
      settings: {},
    } as ChildContext

    const babelContext = {
      parserPath: '@babel/eslint-parser',
      parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      settings: {},
    } as ChildContext

    it('works with espree & traditional namespace exports', () => {
      const path = testFilePath('deep/a.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const a = ExportMap.parse(path, contents, espreeContext)!
      expect(a.errors).toHaveLength(0)
      expect(a.get('b')!.namespace).toBeDefined()
      expect(a.get('b')!.namespace!.has('c')).toBe(true)
    })

    it('captures namespace exported as default', () => {
      const path = testFilePath('deep/default.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const def = ExportMap.parse(path, contents, espreeContext)!
      expect(def.errors).toHaveLength(0)
      expect(def.get('default')!.namespace).toBeDefined()
      expect(def.get('default')!.namespace!.has('c')).toBe(true)
    })

    it('works with @babel/eslint-parser & ES7 namespace exports', function () {
      const path = testFilePath('deep-es7/a.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const a = ExportMap.parse(path, contents, babelContext)!
      expect(a.errors).toHaveLength(0)
      expect(a.get('b')!.namespace).toBeDefined()
      expect(a.get('b')!.namespace!.has('c')).toBe(true)
    })
  })

  describe('deep namespace caching', () => {
    const espreeContext = {
      parserPath: 'espree',
      parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      settings: {},
    } as ChildContext

    let a: ExportMap | null

    beforeAll(async () => {
      try {
        // first version
        await fs.promises.writeFile(
          testFilePath('deep/cache-2.js'),
          await fs.promises.readFile(testFilePath('deep/cache-2a.js')),
        )

        const path = testFilePath('deep/cache-1.js')
        const contents = await fs.promises.readFile(path, { encoding: 'utf8' })
        a = ExportMap.parse(path, contents, espreeContext)!
        expect(a.errors).toHaveLength(0)

        expect(a.get('b')!.namespace).toBeDefined()
        expect(a.get('b')!.namespace!.has('c')).toBe(true)

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
      expect(a!.get('b')!.namespace!.has('c')).toBe(false)
    })

    afterAll(done => fs.unlink(testFilePath('deep/cache-2.js'), done))
  })

  describe('Map API', () => {
    describe('#size', () => {
      it('counts the names', () =>
        expect(ExportMap.get('./named-exports', fakeContext)).toHaveProperty(
          'size',
          12,
        ))

      it('includes exported namespace size', () =>
        expect(ExportMap.get('./export-all', fakeContext)).toHaveProperty(
          'size',
          1,
        ))
    })
  })

  describe('issue #210: self-reference', () => {
    it(`doesn't crash`, () => {
      expect(() => ExportMap.get('./narcissist', fakeContext)).not.toThrow(
        Error,
      )
    })
    it(`'has' circular reference`, () => {
      const result = ExportMap.get('./narcissist', fakeContext)!
      expect(result).toBeDefined()
      expect(result.has('soGreat')).toBe(true)
    })
    it(`can 'get' circular reference`, () => {
      const result = ExportMap.get('./narcissist', fakeContext)!
      expect(result).toBeDefined()
      expect(result.get('soGreat') != null).toBe(true)
    })
  })

  describe('issue #478: never parse non-whitelist extensions', () => {
    const context = {
      ...fakeContext,
      settings: { 'import-x/extensions': ['.js'] as const },
    }

    it('returns nothing for a TypeScript file', () => {
      expect(ExportMap.get('./typescript.ts', context)).toBeFalsy()
    })
  })

  describe('alternate parsers', () => {
    describe('array form', () => {
      const context = {
        ...fakeContext,
        settings: {
          'import-x/extensions': ['.js'],
          'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
        } as const,
      }

      jest.setTimeout(20e3) // takes a long time :shrug:

      const spied = jest.fn()

      jest.unstable_mockModule('get-tsconfig', () => ({
        ...getTsconfig,
        getTsconfig: spied,
      }))

      const imports = ExportMap.get('./typescript.ts', context)!

      afterAll(() => {
        spied.mockRestore()
      })

      it('returns something for a TypeScript file', () => {
        expect(imports).toBeDefined()
      })

      it('has no parse errors', () => {
        expect(imports.errors).toHaveLength(0)
      })

      it('has exported function', () => {
        expect(imports.has('getFoo')).toBe(true)
      })

      it('has exported typedef', () => {
        expect(imports.has('MyType')).toBe(true)
      })

      it('has exported enum', () => {
        expect(imports.has('MyEnum')).toBe(true)
      })

      it('has exported interface', () => {
        expect(imports.has('Foo')).toBe(true)
      })

      it('has exported abstract class', () => {
        expect(imports.has('Bar')).toBe(true)
      })

      it.skip('should cache tsconfig until tsconfigRootDir parser option changes', async () => {
        jest.resetModules()

        const { ExportMap: FreshNewExportMap } = await import(
          'eslint-plugin-import-x/utils'
        )

        expect(FreshNewExportMap).not.toBe(ExportMap)
        expect(spied).toHaveBeenCalledTimes(0)

        const customContext = {
          ...context,
          parserOptions: {
            tsconfigRootDir: null,
          },
        } as unknown as ChildContext
        FreshNewExportMap.parse(
          './baz.ts',
          'export const baz = 5',
          customContext,
        )
        expect(spied).toHaveBeenCalledTimes(1)
        FreshNewExportMap.parse(
          './baz.ts',
          'export const baz = 5',
          customContext,
        )
        expect(spied).toHaveBeenCalledTimes(1)

        const differentContext = {
          ...context,
          parserOptions: {
            tsconfigRootDir: process.cwd(),
          },
        } as unknown as ChildContext

        FreshNewExportMap.parse(
          './baz.ts',
          'export const baz = 5',
          differentContext,
        )
        expect(spied).toHaveBeenCalledTimes(2)
      })

      it('should cache after parsing for an ambiguous module', () => {
        const source = './typescript-declare-module.ts'
        const parseSpy = jest.spyOn(ExportMap, 'parse').mockClear()

        expect(ExportMap.get(source, context)).toBeNull()

        ExportMap.get(source, context)

        expect(parseSpy).toHaveBeenCalledTimes(1)

        parseSpy.mockRestore()
      })
    })
  })

  // TODO: move to utils
  describe('unambiguous regex', () => {
    const testFiles = [
      ['deep/b.js', true],
      ['bar.js', true],
      ['deep-es7/b.js', true],
      ['common.js', false],
    ]

    for (const [testFile, expectedRegexResult] of testFiles) {
      it(`works for ${testFile} (${expectedRegexResult})`, () => {
        const content = fs.readFileSync(`./test/fixtures/${testFile}`, 'utf8')
        expect(isMaybeUnambiguousModule(content)).toBe(expectedRegexResult)
      })
    }
  })
})
