/**
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 */

import fs from 'fs'
import fsP from 'fs/promises'
import { setTimeout } from 'timers/promises'

import eslintPkg from 'eslint/package.json'
import * as getTsconfig from 'get-tsconfig'
import semver from 'semver'

import { getFilename, parsers, testContext } from '../utils'

import { test as testUnambiguous } from 'eslint-module-utils/unambiguous'
import ExportMap from 'eslint-plugin-i/ExportMap'

describe('ExportMap', function () {
  /**
   * @type {RuleContext}
   */
  const fakeContext = {
    ...testContext(null, semver.satisfies(eslintPkg.version, '>= 7.28')),
    parserPath: parsers.BABEL,
  }

  it('handles ExportAllDeclaration', function () {
    let imports
    expect(() => {
      imports = ExportMap.get('./export-all', fakeContext)
    }).not.toThrow()

    expect(imports).toBeDefined()
    expect(imports.has('foo')).toBe(true)
  })

  it('returns a cached copy on subsequent requests', function () {
    expect(ExportMap.get('./named-exports', fakeContext)).toEqual(
      ExportMap.get('./named-exports', fakeContext),
    )
  })

  it('does not return a cached copy after modification', async () => {
    const firstAccess = ExportMap.get('./mutator', fakeContext)
    expect(firstAccess).toBeDefined()

    // mutate (update modified time)
    const newDate = new Date()
    await fsP.utimes(getFilename('mutator.js'), newDate, newDate)
    expect(ExportMap.get('./mutator', fakeContext)).not.toEqual(firstAccess)
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
    expect(result).not.toEqual(firstAccess)
  })

  it('does not throw for a missing file', function () {
    let imports
    expect(function () {
      imports = ExportMap.get('./does-not-exist', fakeContext)
    }).not.toThrow()

    expect(imports).toBeNull()
  })

  it('exports explicit names for a missing file in exports', function () {
    let imports
    expect(function () {
      imports = ExportMap.get('./exports-missing', fakeContext)
    }).not.toThrow()

    expect(imports).toBeDefined()
    expect(imports.has('bar')).toBe(true)
  })

  it('finds exports for an ES7 module with @babel/eslint-parser', function () {
    const path = getFilename('jsx/FooES7.js')
    const contents = fs.readFileSync(path, { encoding: 'utf8' })
    const imports = ExportMap.parse(path, contents, {
      parserPath: '@babel/eslint-parser',
      settings: {},
    })

    expect(imports).toBeDefined()
    expect(imports.errors).toHaveLength(0)
    expect(imports.get('default')).toBeDefined()
    expect(imports.has('Bar')).toBe(true)
  })

  describe('deprecation metadata', function () {
    function jsdocTests(parseContext, lineEnding) {
      describe('deprecated imports', function () {
        let imports
        beforeEach(
          // 'parse file',
          function () {
            const path = getFilename('deprecated.js')
            const contents = fs
              .readFileSync(path, { encoding: 'utf8' })
              .replaceAll('\r\n', lineEnding)
            imports = ExportMap.parse(path, contents, parseContext)

            // sanity checks
            // eslint-disable-next-line jest/no-standalone-expect
            expect(imports.errors).toHaveLength(0)
          },
        )

        it('works with named imports.', function () {
          expect(imports.has('fn')).toBe(true)

          expect(imports.get('fn')).toHaveProperty(
            'doc.tags[0].title',
            'deprecated',
          )
          expect(imports.get('fn')).toHaveProperty(
            'doc.tags[0].description',
            "please use 'x' instead.",
          )
        })

        it('works with default imports.', function () {
          expect(imports.has('default')).toBe(true)
          const importMeta = imports.get('default')

          expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
          expect(importMeta).toHaveProperty(
            'doc.tags[0].description',
            'this is awful, use NotAsBadClass.',
          )
        })

        it('works with variables.', function () {
          expect(imports.has('MY_TERRIBLE_ACTION')).toBe(true)
          const importMeta = imports.get('MY_TERRIBLE_ACTION')

          expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
          expect(importMeta).toHaveProperty(
            'doc.tags[0].description',
            'please stop sending/handling this action type.',
          )
        })

        describe('multi-line variables', function () {
          it('works for the first one', function () {
            expect(imports.has('CHAIN_A')).toBe(true)
            const importMeta = imports.get('CHAIN_A')

            expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
            expect(importMeta).toHaveProperty(
              'doc.tags[0].description',
              'this chain is awful',
            )
          })
          it('works for the second one', function () {
            expect(imports.has('CHAIN_B')).toBe(true)
            const importMeta = imports.get('CHAIN_B')

            expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
            expect(importMeta).toHaveProperty(
              'doc.tags[0].description',
              'so awful',
            )
          })
          it('works for the third one, etc.', function () {
            expect(imports.has('CHAIN_C')).toBe(true)
            const importMeta = imports.get('CHAIN_C')

            expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
            expect(importMeta).toHaveProperty(
              'doc.tags[0].description',
              'still terrible',
            )
          })
        })
      })

      describe('full module', function () {
        let imports
        beforeEach(
          // 'parse file',
          function () {
            const path = getFilename('deprecated-file.js')
            const contents = fs.readFileSync(path, { encoding: 'utf8' })
            imports = ExportMap.parse(path, contents, parseContext)

            // sanity checks
            // eslint-disable-next-line jest/no-standalone-expect
            expect(imports.errors).toHaveLength(0)
          },
        )

        it('has JSDoc metadata', function () {
          expect(imports.doc).toBeDefined()
        })
      })
    }

    describe('default parser', function () {
      jsdocTests(
        {
          parserPath: 'espree',
          parserOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            attachComment: true,
          },
          settings: {},
        },
        '\n',
      )
      jsdocTests(
        {
          parserPath: 'espree',
          parserOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            attachComment: true,
          },
          settings: {},
        },
        '\r\n',
      )
    })

    describe('@babel/eslint-parser', function () {
      jsdocTests(
        {
          parserPath: '@babel/eslint-parser',
          parserOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            attachComment: true,
          },
          settings: {},
        },
        '\n',
      )
      jsdocTests(
        {
          parserPath: '@babel/eslint-parser',
          parserOptions: {
            ecmaVersion: 2023,
            sourceType: 'module',
            attachComment: true,
          },
          settings: {},
        },
        '\r\n',
      )
    })
  })

  describe('exported static namespaces', function () {
    const espreeContext = {
      parserPath: 'espree',
      parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
      settings: {},
    }
    const babelContext = {
      parserPath: '@babel/eslint-parser',
      parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
      settings: {},
    }

    it('works with espree & traditional namespace exports', function () {
      const path = getFilename('deep/a.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const a = ExportMap.parse(path, contents, espreeContext)
      expect(a.errors).toHaveLength(0)
      expect(a.get('b').namespace).toBeDefined()
      expect(a.get('b').namespace.has('c')).toBe(true)
    })

    it('captures namespace exported as default', function () {
      const path = getFilename('deep/default.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const def = ExportMap.parse(path, contents, espreeContext)
      expect(def.errors).toHaveLength(0)
      expect(def.get('default').namespace).toBeDefined()
      expect(def.get('default').namespace.has('c')).toBe(true)
    })

    it('works with @babel/eslint-parser & ES7 namespace exports', function () {
      const path = getFilename('deep-es7/a.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const a = ExportMap.parse(path, contents, babelContext)
      expect(a.errors).toHaveLength(0)
      expect(a.get('b').namespace).toBeDefined()
      expect(a.get('b').namespace.has('c')).toBe(true)
    })
  })

  describe('deep namespace caching', function () {
    const espreeContext = {
      parserPath: 'espree',
      parserOptions: { ecmaVersion: 2023, sourceType: 'module' },
      settings: {},
    }
    let a
    beforeEach(
      // 'sanity check and prime cache',
      async () => {
        // first version
        fs.writeFileSync(
          getFilename('deep/cache-2.js'),
          fs.readFileSync(getFilename('deep/cache-2a.js')),
        )

        const path = getFilename('deep/cache-1.js')
        const contents = fs.readFileSync(path, { encoding: 'utf8' })
        a = ExportMap.parse(path, contents, espreeContext)

        /* eslint-disable jest/no-standalone-expect */
        expect(a.errors).toHaveLength(0)
        expect(a.get('b').namespace).toBeDefined()
        expect(a.get('b').namespace.has('c')).toBe(true)
        /* eslint-enable jest/no-standalone-expect */

        // wait ~1s, cache check is 1s resolution
        await setTimeout(1100)

        fs.unlinkSync(getFilename('deep/cache-2.js'))
        // swap in a new file and touch it
        fs.writeFileSync(
          getFilename('deep/cache-2.js'),
          fs.readFileSync(getFilename('deep/cache-2b.js')),
        )
      },
    )

    it('works', function () {
      expect(a.get('b').namespace.has('c')).toBe(false)
    })

    afterEach(
      // 'remove test file',
      () => fsP.unlink(getFilename('deep/cache-2.js')),
    )
  })

  describe('Map API', function () {
    describe('#size', function () {
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

  describe('issue #210: self-reference', function () {
    it(`doesn't crash`, function () {
      expect(() => ExportMap.get('./narcissist', fakeContext)).not.toThrow(
        Error,
      )
    })
    it(`'has' circular reference`, function () {
      expect(ExportMap.get('./narcissist', fakeContext))
        .toBeDefined()
        .and.satisfy(m => m.has('soGreat'))
    })
    it(`can 'get' circular reference`, function () {
      expect(ExportMap.get('./narcissist', fakeContext))
        .toBeDefined()
        .and.satisfy(m => m.get('soGreat') != null)
    })
  })

  describe('issue #478: never parse non-whitelist extensions', function () {
    const context = {
      ...fakeContext,
      settings: { 'i/extensions': ['.js'] },
    }

    let imports
    beforeEach(
      // 'load imports',
      function () {
        imports = ExportMap.get('./typescript.ts', context)
      },
    )

    it('returns nothing for a TypeScript file', function () {
      expect(imports).not.toBeDefined()
    })
  })

  describe('alternate parsers', function () {
    const configs = [
      ['array form', { '@typescript-eslint/parser': ['.ts', '.tsx'] }],
    ]

    for (const [description, parserConfig] of configs) {
      // eslint-disable-next-line jest/valid-title
      describe(description, function () {
        const context = {
          ...fakeContext,
          settings: {
            'i/extensions': ['.js'],
            'i/parsers': parserConfig,
          },
        }

        let imports
        beforeEach(
          // 'load imports',
          () => {
            jest.setTimeout(20e3) // takes a long time :shrug:
            jest.spyOn(getTsconfig, 'getTsconfig')
            imports = ExportMap.get('./typescript.ts', context)
          },
        )
        afterEach(
          // 'clear spies',
          () => jest.clearAllMocks(),
        )

        it('returns something for a TypeScript file', function () {
          expect(imports).toBeDefined()
        })

        it('has no parse errors', function () {
          expect(imports).property('errors').toHaveLength(0)
        })

        it('has exported function', function () {
          expect(imports.has('getFoo')).toBe(true)
        })

        it('has exported typedef', function () {
          expect(imports.has('MyType')).toBe(true)
        })

        it('has exported enum', function () {
          expect(imports.has('MyEnum')).toBe(true)
        })

        it('has exported interface', function () {
          expect(imports.has('Foo')).toBe(true)
        })

        it('has exported abstract class', function () {
          expect(imports.has('Bar')).toBe(true)
        })

        it('should cache tsconfig until tsconfigRootDir parser option changes', function () {
          const customContext = {
            ...context,
            parserOptions: {
              tsconfigRootDir: null,
            },
          }
          expect(getTsconfig.getTsconfig).not.toHaveBeenCalled()
          ExportMap.parse('./baz.ts', 'export const baz = 5', customContext)
          expect(getTsconfig.getTsconfig).toHaveBeenCalledTimes(1)
          ExportMap.parse('./baz.ts', 'export const baz = 5', customContext)
          expect(getTsconfig.getTsconfig).toHaveBeenCalledTimes(1)

          const differentContext = {
            ...context,
            parserOptions: {
              tsconfigRootDir: process.cwd(),
            },
          }

          ExportMap.parse('./baz.ts', 'export const baz = 5', differentContext)
          expect(getTsconfig.getTsconfig).toHaveBeenCalledTimes(2)
        })

        it('should cache after parsing for an ambiguous module', function () {
          const source = './typescript-declare-module.ts'
          const parseSpy = jest.spyOn(ExportMap, 'parse')

          expect(ExportMap.get(source, context)).toBe(null)

          ExportMap.get(source, context)

          expect(parseSpy).toHaveBeenCalledTimes(1)

          parseSpy.restore()
        })
      })
    }
  })

  // todo: move to utils
  describe('unambiguous regex', function () {
    const testFiles = /** @type {const} */ ([
      ['deep/b.js', true],
      ['bar.js', true],
      ['deep-es7/b.js', true],
      ['common.js', false],
    ])

    for (const [testFile, expectedRegexResult] of testFiles) {
      it(`works for ${testFile} (${expectedRegexResult})`, function () {
        const content = fs.readFileSync(`./test/fixtures/${testFile}`, 'utf8')
        expect(testUnambiguous(content)).toEqual(expectedRegexResult)
      })
    }
  })
})
