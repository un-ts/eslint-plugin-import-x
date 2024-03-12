import eslintPkg from 'eslint/package.json'
import semver from 'semver'

import resolve, {
  CASE_SENSITIVE_FS,
  fileExistsWithCaseSync,
} from '../../src/utils/resolve'

import * as path from 'path'
import * as fs from 'fs'
import * as utils from '../utils'

describe('resolve', () => {
  it('throws on bad parameters', () => {
    expect(resolve.bind(null, null, null)).toThrow(Error)
  })

  it('resolves via a custom resolver with interface version 1', () => {
    const testContext = utils.testContext({
      'import-x/resolver': './foo-bar-resolver-v1',
    })

    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBe(utils.testFilePath('./bar.jsx'))

    expect(
      resolve('../fixtures/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toBeUndefined()

    expect(
      resolve('../fixtures/not-found', {
        ...testContext,
        getFilename() {
          return utils.getFilename('not-found.js')
        },
      }),
    ).toBeUndefined()
  })

  it('resolves via a custom resolver with interface version 1 assumed if not specified', () => {
    const testContext = utils.testContext({
      'import-x/resolver': './foo-bar-resolver-no-version',
    })

    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBe(utils.testFilePath('./bar.jsx'))

    expect(
      resolve('../fixtures/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toBeUndefined()

    expect(
      resolve('../fixtures/not-found', {
        ...testContext,
        getFilename() {
          return utils.getFilename('not-found.js')
        },
      }),
    ).toBeUndefined()
  })

  it('resolves via a custom resolver with interface version 2', () => {
    const testContext = utils.testContext({
      'import-x/resolver': './foo-bar-resolver-v2',
    })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBe(utils.testFilePath('./bar.jsx'))

    testContextReports.length = 0
    expect(
      resolve('../fixtures/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(testContextReports[0].message).toMatch(
      'Resolve error: foo-bar-resolver-v2 resolve test exception',
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

    testContextReports.length = 0
    expect(
      resolve('../fixtures/not-found', {
        ...testContext,
        getFilename() {
          return utils.getFilename('not-found.js')
        },
      }),
    ).toBeUndefined()
    expect(testContextReports.length).toBe(0)
  })

  it('respects import-x/resolver as array of strings', () => {
    const testContext = utils.testContext({
      'import-x/resolver': ['./foo-bar-resolver-v2', './foo-bar-resolver-v1'],
    })

    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBe(utils.testFilePath('./bar.jsx'))
  })

  it('respects import-x/resolver as object', () => {
    const testContext = utils.testContext({
      'import-x/resolver': { './foo-bar-resolver-v2': {} },
    })

    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBe(utils.testFilePath('./bar.jsx'))
  })

  it('respects import-x/resolver as array of objects', () => {
    const testContext = utils.testContext({
      'import-x/resolver': [
        { './foo-bar-resolver-v2': {} },
        { './foo-bar-resolver-v1': {} },
      ],
    })

    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBe(utils.testFilePath('./bar.jsx'))
  })

  it('finds resolvers from the source files rather than ../../../src/utils', () => {
    const testContext = utils.testContext({ 'import-x/resolver': { foo: {} } })

    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBe(utils.testFilePath('./bar.jsx'))
  })

  it('reports invalid import-x/resolver config', () => {
    const testContext = utils.testContext({ 'import-x/resolver': 123.456 })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    testContextReports.length = 0
    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(testContextReports[0].message).toMatch(
      'Resolve error: invalid resolver config',
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  it('reports loaded resolver with invalid interface', () => {
    const resolverName = './foo-bar-resolver-invalid'
    const testContext = utils.testContext({ 'import-x/resolver': resolverName })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }
    testContextReports.length = 0
    expect(
      resolve('../fixtures/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(testContextReports[0].message).toMatch(
      `Resolve error: ${resolverName} with invalid interface loaded as resolver`,
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  it('respects import-x/resolve extensions', () => {
    const testContext = utils.testContext({
      'import-x/resolve': { extensions: ['.jsx'] },
    })

    expect(resolve('./jsx/MyCoolComponent', testContext)).toBe(
      utils.testFilePath('./jsx/MyCoolComponent.jsx'),
    )
  })

  it('reports load exception in a user resolver', () => {
    const testContext = utils.testContext({
      'import-x/resolver': './load-error-resolver',
    })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    expect(
      resolve('../fixtures/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(testContextReports[0].message).toMatch(
      'Resolve error: SyntaxError: TEST SYNTAX ERROR',
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  // context.getPhysicalFilename() is available in ESLint 7.28+
  ;(semver.satisfies(eslintPkg.version, '>= 7.28') ? describe : describe.skip)(
    'getPhysicalFilename()',
    () => {
      function unexpectedCallToGetFilename() {
        throw new Error(
          'Expected to call to getPhysicalFilename() instead of getFilename()',
        )
      }

      it('resolves via a custom resolver with interface version 1', () => {
        const testContext = utils.testContext({
          'import-x/resolver': './foo-bar-resolver-v1',
        })

        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBe(utils.testFilePath('./bar.jsx'))

        expect(
          resolve('../fixtures/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toBeUndefined()

        expect(
          resolve('../fixtures/not-found', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('not-found.js')
            },
          }),
        ).toBeUndefined()
      })

      it('resolves via a custom resolver with interface version 1 assumed if not specified', () => {
        const testContext = utils.testContext({
          'import-x/resolver': './foo-bar-resolver-no-version',
        })

        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBe(utils.testFilePath('./bar.jsx'))

        expect(
          resolve('../fixtures/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toBeUndefined()

        expect(
          resolve('../fixtures/not-found', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('not-found.js')
            },
          }),
        ).toBeUndefined()
      })

      it('resolves via a custom resolver with interface version 2', () => {
        const testContext = utils.testContext({
          'import-x/resolver': './foo-bar-resolver-v2',
        })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }

        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBe(utils.testFilePath('./bar.jsx'))

        testContextReports.length = 0
        expect(
          resolve('../fixtures/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toBeUndefined()
        expect(testContextReports[0]).toBeInstanceOf(Object)
        expect(testContextReports[0].message).toMatch(
          'Resolve error: foo-bar-resolver-v2 resolve test exception',
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

        testContextReports.length = 0
        expect(
          resolve('../fixtures/not-found', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('not-found.js')
            },
          }),
        ).toBeUndefined()
        expect(testContextReports.length).toBe(0)
      })

      it('respects import-x/resolver as array of strings', () => {
        const testContext = utils.testContext({
          'import-x/resolver': [
            './foo-bar-resolver-v2',
            './foo-bar-resolver-v1',
          ],
        })

        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBe(utils.testFilePath('./bar.jsx'))
      })

      it('respects import-x/resolver as object', () => {
        const testContext = utils.testContext({
          'import-x/resolver': { './foo-bar-resolver-v2': {} },
        })

        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBe(utils.testFilePath('./bar.jsx'))
      })

      it('respects import-x/resolver as array of objects', () => {
        const testContext = utils.testContext({
          'import-x/resolver': [
            { './foo-bar-resolver-v2': {} },
            { './foo-bar-resolver-v1': {} },
          ],
        })

        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBe(utils.testFilePath('./bar.jsx'))
      })

      it('finds resolvers from the source files rather than ../../../src/utils', () => {
        const testContext = utils.testContext({
          'import-x/resolver': { foo: {} },
        })

        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBe(utils.testFilePath('./bar.jsx'))
      })

      it('reports invalid import-x/resolver config', () => {
        const testContext = utils.testContext({ 'import-x/resolver': 123.456 })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }

        testContextReports.length = 0
        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBeUndefined()
        expect(testContextReports[0]).toBeInstanceOf(Object)
        expect(testContextReports[0].message).toMatch(
          'Resolve error: invalid resolver config',
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
      })

      it('reports loaded resolver with invalid interface', () => {
        const resolverName = './foo-bar-resolver-invalid'
        const testContext = utils.testContext({
          'import-x/resolver': resolverName,
        })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }
        testContextReports.length = 0
        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toBeUndefined()
        expect(testContextReports[0]).toBeInstanceOf(Object)
        expect(testContextReports[0].message).toMatch(
          `Resolve error: ${resolverName} with invalid interface loaded as resolver`,
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
      })

      it('respects import-x/resolve extensions', () => {
        const testContext = utils.testContext({
          'import-x/resolve': { extensions: ['.jsx'] },
        })

        expect(resolve('./jsx/MyCoolComponent', testContext)).toBe(
          utils.testFilePath('./jsx/MyCoolComponent.jsx'),
        )
      })

      it('reports load exception in a user resolver', () => {
        const testContext = utils.testContext({
          'import-x/resolver': './load-error-resolver',
        })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }

        expect(
          resolve('../fixtures/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toBeUndefined()
        expect(testContextReports[0]).toBeInstanceOf(Object)
        expect(testContextReports[0].message).toMatch(
          'Resolve error: SyntaxError: TEST SYNTAX ERROR',
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
      })
    },
  )

  const caseDescribe = !CASE_SENSITIVE_FS ? describe : describe.skip
  caseDescribe('case sensitivity', function () {
    let file
    const testContext = utils.testContext({
      'import-x/resolve': { extensions: ['.jsx'] },
      'import-x/cache': { lifetime: 0 },
    })
    const testSettings = testContext.settings
    beforeAll(() => {
      file = resolve(
        // Note the case difference 'MyUncoolComponent' vs 'MyUnCoolComponent'
        './jsx/MyUncoolComponent',
        testContext,
      )
    })
    it('resolves regardless of case', () => {
      // path to ./jsx/MyUncoolComponent
      expect(file).toBeDefined()
    })
    it('detects case does not match FS', () => {
      expect(fileExistsWithCaseSync(file, testSettings)).toBe(false)
    })
    it('detecting case does not include parent folder path (issue #720)', () => {
      const f = path.join(
        process.cwd().toUpperCase(),
        './test/fixtures/jsx/MyUnCoolComponent.jsx',
      )
      expect(fileExistsWithCaseSync(f, testSettings)).toBe(true)
    })
    it('detecting case should include parent folder path', () => {
      const f = path.join(
        process.cwd().toUpperCase(),
        './test/fixtures/jsx/MyUnCoolComponent.jsx',
      )
      expect(fileExistsWithCaseSync(f, testSettings, true)).toBe(false)
    })
  })

  describe('rename cache correctness', () => {
    const context = utils.testContext({
      'import-x/cache': { lifetime: 1 },
    })

    const infiniteContexts = ['∞', 'Infinity'].map(inf => [
      inf,
      utils.testContext({
        'import-x/cache': { lifetime: inf },
      }),
    ])

    const pairs = [['./CaseyKasem.js', './CASEYKASEM2.js']]

    pairs.forEach(([original, changed]) => {
      describe(`${original} => ${changed}`, () => {
        beforeAll(() => {
          expect(resolve(original, context)).toBeDefined()
          expect(resolve(changed, context)).toBeFalsy()
        })

        // settings are part of cache key
        beforeAll(() => {
          infiniteContexts.forEach(([, c]) => {
            expect(resolve(original, c)).toBeDefined()
          })
        })

        beforeAll(done => {
          fs.rename(
            utils.testFilePath(original),
            utils.testFilePath(changed),
            done,
          )
        })

        beforeAll(done =>
          fs.exists(utils.testFilePath(changed), exists =>
            done(exists ? null : new Error('new file does not exist')),
          ),
        )

        it('gets cached values within cache lifetime', () => {
          // get cached values initially
          expect(resolve(original, context)).toBeDefined()
        })

        it('gets updated values immediately', () => {
          // get cached values initially
          expect(resolve(changed, context)).toBeDefined()
        })

        // special behavior for infinity
        describe('infinite cache', () => {
          jest.setTimeout(1.5e3)

          beforeAll(done => {
            setTimeout(done, 1100)
          })

          infiniteContexts.forEach(([inf, infiniteContext]) => {
            it(`lifetime: ${inf} still gets cached values after ~1s`, () => {
              // original
              expect(resolve(original, infiniteContext)).toBeDefined()
            })
          })
        })

        describe('finite cache', () => {
          jest.setTimeout(1.2e3)
          beforeAll(done => {
            setTimeout(done, 1000)
          })
          it('gets correct values after cache lifetime', () => {
            expect(resolve(original, context)).toBeFalsy()
            expect(resolve(changed, context)).toBeDefined()
          })
        })

        afterAll(done => {
          fs.rename(
            utils.testFilePath(changed),
            utils.testFilePath(original),
            done,
          )
        })
      })
    })
  })
})
