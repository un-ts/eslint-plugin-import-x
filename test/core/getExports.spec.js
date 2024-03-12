import semver from 'semver'
import eslintPkg from 'eslint/package.json'
import typescriptPkg from 'typescript/package.json'
import * as tsConfigLoader from 'tsconfig-paths/lib/tsconfig-loader'
import ExportMap from '../../src/ExportMap'

import * as fs from 'fs'

import { getFilename } from '../utils'
import { test as testUnambiguous } from '../../src/utils/unambiguous'

describe('ExportMap', () => {
  const fakeContext = Object.assign(
    semver.satisfies(eslintPkg.version, '>= 7.28')
      ? {
          getFilename() {
            throw new Error(
              'Should call getPhysicalFilename() instead of getFilename()',
            )
          },
          getPhysicalFilename: getFilename,
        }
      : {
          getFilename,
        },
    {
      settings: {},
      parserPath: '@babel/eslint-parser',
    },
  )

  it('handles ExportAllDeclaration', () => {
    let imports
    expect(function () {
      imports = ExportMap.get('./export-all', fakeContext)
    }).not.toThrow(Error)

    expect(imports).toBeDefined()
    expect(imports.has('foo')).toBe(true)
  })

  it('returns a cached copy on subsequent requests', () => {
    expect(ExportMap.get('./named-exports', fakeContext)).toBe(
      ExportMap.get('./named-exports', fakeContext),
    )
  })

  it('does not return a cached copy after modification', done => {
    const firstAccess = ExportMap.get('./mutator', fakeContext)
    expect(firstAccess).toBeDefined()

    // mutate (update modified time)
    const newDate = new Date()
    fs.utimes(getFilename('mutator.js'), newDate, newDate, error => {
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
    }).not.toThrow(Error)

    expect(imports).toBeFalsy()
  })

  it('exports explicit names for a missing file in exports', () => {
    let imports
    expect(function () {
      imports = ExportMap.get('./exports-missing', fakeContext)
    }).not.toThrow(Error)

    expect(imports).toBeDefined()
    expect(imports.has('bar')).toBe(true)
  })

  it('finds exports for an ES7 module with @babel/eslint-parser', () => {
    const path = getFilename('jsx/FooES7.js')
    const contents = fs.readFileSync(path, { encoding: 'utf8' })
    const imports = ExportMap.parse(path, contents, {
      parserPath: '@babel/eslint-parser',
      settings: {},
    })

    // imports
    expect(imports).toBeDefined()
    expect(imports.errors).toHaveLength(0)
    // default export
    expect(imports.get('default')).toBeDefined()
    expect(imports.has('Bar')).toBe(true)
  })

  describe('deprecation metadata', () => {
    function jsdocTests(parseContext, lineEnding) {
      describe('deprecated imports', () => {
        let imports
        beforeAll(() => {
          const path = getFilename('deprecated.js')
          const contents = fs
            .readFileSync(path, { encoding: 'utf8' })
            .replace(/[\r]\n/g, lineEnding)
          imports = ExportMap.parse(path, contents, parseContext)

          // sanity checks
          expect(imports.errors).toHaveLength(0)
        })

        it('works with named imports.', () => {
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

        it('works with default imports.', () => {
          expect(imports.has('default')).toBe(true)
          const importMeta = imports.get('default')

          expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
          expect(importMeta).toHaveProperty(
            'doc.tags[0].description',
            'this is awful, use NotAsBadClass.',
          )
        })

        it('works with variables.', () => {
          expect(imports.has('MY_TERRIBLE_ACTION')).toBe(true)
          const importMeta = imports.get('MY_TERRIBLE_ACTION')

          expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
          expect(importMeta).toHaveProperty(
            'doc.tags[0].description',
            'please stop sending/handling this action type.',
          )
        })

        describe('multi-line variables', () => {
          it('works for the first one', () => {
            expect(imports.has('CHAIN_A')).toBe(true)
            const importMeta = imports.get('CHAIN_A')

            expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
            expect(importMeta).toHaveProperty(
              'doc.tags[0].description',
              'this chain is awful',
            )
          })
          it('works for the second one', () => {
            expect(imports.has('CHAIN_B')).toBe(true)
            const importMeta = imports.get('CHAIN_B')

            expect(importMeta).toHaveProperty('doc.tags[0].title', 'deprecated')
            expect(importMeta).toHaveProperty(
              'doc.tags[0].description',
              'so awful',
            )
          })
          it('works for the third one, etc.', () => {
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

      describe('full module', () => {
        let imports
        beforeAll(() => {
          const path = getFilename('deprecated-file.js')
          const contents = fs.readFileSync(path, { encoding: 'utf8' })
          imports = ExportMap.parse(path, contents, parseContext)

          // sanity checks
          expect(imports.errors).toHaveLength(0)
        })

        it('has JSDoc metadata', () => {
          expect(imports.doc).toBeDefined()
        })
      })
    }

    describe('default parser', () => {
      jsdocTests(
        {
          parserPath: 'espree',
          parserOptions: {
            ecmaVersion: 2015,
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
            ecmaVersion: 2015,
            sourceType: 'module',
            attachComment: true,
          },
          settings: {},
        },
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
            ecmaVersion: 2015,
            sourceType: 'module',
            attachComment: true,
          },
          settings: {},
        },
        '\r\n',
      )
    })
  })

  describe('exported static namespaces', () => {
    const espreeContext = {
      parserPath: 'espree',
      parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      settings: {},
    }
    // const babelContext = { parserPath: '@babel/eslint-parser', parserOptions: { ecmaVersion: 2015, sourceType: 'module' }, settings: {} };

    it('works with espree & traditional namespace exports', () => {
      const path = getFilename('deep/a.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const a = ExportMap.parse(path, contents, espreeContext)
      expect(a.errors).toHaveLength(0)
      expect(a.get('b').namespace).toBeDefined()
      expect(a.get('b').namespace.has('c')).toBe(true)
    })

    it('captures namespace exported as default', () => {
      const path = getFilename('deep/default.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      const def = ExportMap.parse(path, contents, espreeContext)
      expect(def.errors).toHaveLength(0)
      expect(def.get('default').namespace).toBeDefined()
      expect(def.get('default').namespace.has('c')).toBe(true)
    })

    // FIXME: check and enable
    // it('works with @babel/eslint-parser & ES7 namespace exports', function () {
    //   const path = getFilename('deep-es7/a.js');
    //   const contents = fs.readFileSync(path, { encoding: 'utf8' });
    //   const a = ExportMap.parse(path, contents, babelContext);
    //   expect(a.errors).to.be.empty;
    //   expect(a.get('b').namespace).to.exist;
    //   expect(a.get('b').namespace.has('c')).to.be.true;
    // });
  })

  describe('deep namespace caching', () => {
    const espreeContext = {
      parserPath: 'espree',
      parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      settings: {},
    }
    let a
    beforeAll(done => {
      // first version
      fs.writeFileSync(
        getFilename('deep/cache-2.js'),
        fs.readFileSync(getFilename('deep/cache-2a.js')),
      )

      const path = getFilename('deep/cache-1.js')
      const contents = fs.readFileSync(path, { encoding: 'utf8' })
      a = ExportMap.parse(path, contents, espreeContext)
      expect(a.errors).toHaveLength(0)

      expect(a.get('b').namespace).toBeDefined()
      expect(a.get('b').namespace.has('c')).toBe(true)

      // wait ~1s, cache check is 1s resolution
      setTimeout(function reup() {
        fs.unlinkSync(getFilename('deep/cache-2.js'))
        // swap in a new file and touch it
        fs.writeFileSync(
          getFilename('deep/cache-2.js'),
          fs.readFileSync(getFilename('deep/cache-2b.js')),
        )
        done()
      }, 1100)
    })

    it('works', () => {
      expect(a.get('b').namespace.has('c')).toBe(false)
    })

    afterAll(done => fs.unlink(getFilename('deep/cache-2.js'), done))
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
      const result = ExportMap.get('./narcissist', fakeContext)
      expect(result).toBeDefined()
      expect(result.has('soGreat')).toBe(true)
    })
    it(`can 'get' circular reference`, () => {
      const result = ExportMap.get('./narcissist', fakeContext)
      expect(result).toBeDefined()
      expect(result.get('soGreat') != null).toBe(true)
    })
  })

  describe('issue #478: never parse non-whitelist extensions', () => {
    const context = {
      ...fakeContext,
      settings: { 'import-x/extensions': ['.js'] },
    }

    let imports
    beforeAll(() => {
      imports = ExportMap.get('./typescript.ts', context)
    })

    it('returns nothing for a TypeScript file', () => {
      expect(imports).toBeFalsy()
    })
  })

  describe('alternate parsers', () => {
    const configs = [
      // ['string form', { 'typescript-eslint-parser': '.ts' }],
    ]

    if (semver.satisfies(eslintPkg.version, '>5')) {
      configs.push([
        'array form',
        { '@typescript-eslint/parser': ['.ts', '.tsx'] },
      ])
    }

    if (
      semver.satisfies(eslintPkg.version, '<6') &&
      semver.satisfies(typescriptPkg.version, '<4')
    ) {
      configs.push([
        'array form',
        { 'typescript-eslint-parser': ['.ts', '.tsx'] },
      ])
    }

    configs.forEach(([description, parserConfig]) => {
      describe(description, () => {
        const context = {
          ...fakeContext,
          settings: {
            'import-x/extensions': ['.js'],
            'import-x/parsers': parserConfig,
          },
        }

        let imports
        beforeAll(() => {
          jest.setTimeout(20e3) // takes a long time :shrug:
          jest.spyOn(tsConfigLoader, 'tsConfigLoader').mockClear()
          imports = ExportMap.get('./typescript.ts', context)
        })
        afterAll(() => {
          tsConfigLoader.tsConfigLoader.mockRestore()
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

        it('should cache tsconfig until tsconfigRootDir parser option changes', () => {
          const customContext = {
            ...context,
            parserOptions: {
              tsconfigRootDir: null,
            },
          }
          expect(tsConfigLoader.tsConfigLoader).toHaveBeenCalledTimes(0)
          ExportMap.parse('./baz.ts', 'export const baz = 5', customContext)
          expect(tsConfigLoader.tsConfigLoader).toHaveBeenCalledTimes(1)
          ExportMap.parse('./baz.ts', 'export const baz = 5', customContext)
          expect(tsConfigLoader.tsConfigLoader).toHaveBeenCalledTimes(1)

          const differentContext = {
            ...context,
            parserOptions: {
              tsconfigRootDir: process.cwd(),
            },
          }

          ExportMap.parse('./baz.ts', 'export const baz = 5', differentContext)
          expect(tsConfigLoader.tsConfigLoader).toHaveBeenCalledTimes(2)
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
  })

  // todo: move to utils
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
        expect(testUnambiguous(content)).toBe(expectedRegexResult)
      })
    }
  })
})
