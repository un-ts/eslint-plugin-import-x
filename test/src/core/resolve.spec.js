import fs from 'fs/promises'
import path from 'path'
import { setTimeout } from 'timers/promises'

import eslintPkg from 'eslint/package.json'
import semver from 'semver'

import resolve, {
  CASE_SENSITIVE_FS,
  fileExistsWithCaseSync,
} from 'eslint-module-utils/resolve'

import * as utils from '../utils.spec'

describe('resolve', function () {
  // We don't want to test for a specific stack, just that it was there in the error message.
  function replaceErrorStackForTest(str) {
    return typeof str === 'string'
      ? str.replace(/(\n\s+at .+:\d+\)?)+$/, '\n<stack-was-here>')
      : str
  }

  it('throws on bad parameters', function () {
    expect(resolve.bind(null, null, null)).toThrow(Error)
  })

  it('resolves via a custom resolver with interface version 1 - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': './foo-bar-resolver-v1',
    })

    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(utils.testFilePath('./bar.jsx'))

    expect(
      resolve('../files/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toEqual(undefined)

    expect(
      resolve('../files/not-found', {
        ...testContext,
        getFilename() {
          return utils.getFilename('not-found.js')
        },
      }),
    ).toEqual(undefined)
  })

  it('resolves via a custom resolver with interface version 1 assumed if not specified - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': './foo-bar-resolver-no-version',
    })

    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(utils.testFilePath('./bar.jsx'))

    expect(
      resolve('../files/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toEqual(undefined)

    expect(
      resolve('../files/not-found', {
        ...testContext,
        getFilename() {
          return utils.getFilename('not-found.js')
        },
      }),
    ).toEqual(undefined)
  })

  it('resolves via a custom resolver with interface version 2 - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': './foo-bar-resolver-v2',
    })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(utils.testFilePath('./bar.jsx'))

    testContextReports.length = 0
    expect(
      resolve('../files/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toEqual(undefined)
    expect(testContextReports[0]).toMatchObject()
    expect(replaceErrorStackForTest(testContextReports[0].message)).toEqual(
      'Resolve error: foo-bar-resolver-v2 resolve test exception\n<stack-was-here>',
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

    testContextReports.length = 0
    expect(
      resolve('../files/not-found', {
        ...testContext,
        getFilename() {
          return utils.getFilename('not-found.js')
        },
      }),
    ).toEqual(undefined)
    expect(testContextReports.length).toEqual(0)
  })

  it('respects i/resolver as array of strings - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': ['./foo-bar-resolver-v2', './foo-bar-resolver-v1'],
    })

    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(utils.testFilePath('./bar.jsx'))
  })

  it('respects i/resolver as object - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': { './foo-bar-resolver-v2': {} },
    })

    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(utils.testFilePath('./bar.jsx'))
  })

  it('respects i/resolver as array of objects - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': [
        { './foo-bar-resolver-v2': {} },
        { './foo-bar-resolver-v1': {} },
      ],
    })

    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(utils.testFilePath('./bar.jsx'))
  })

  it('finds resolvers from the source files rather than eslint-module-utils - 1', function () {
    const testContext = utils.testContext({ 'i/resolver': { foo: {} } })

    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(utils.testFilePath('./bar.jsx'))
  })

  it('reports invalid i/resolver config - 1', function () {
    const testContext = utils.testContext({ 'i/resolver': 123.456 })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    testContextReports.length = 0
    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(undefined)
    expect(testContextReports[0]).toMatchObject()
    expect(testContextReports[0].message).toEqual(
      'Resolve error: invalid resolver config',
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  it('reports loaded resolver with invalid interface - 1', function () {
    const resolverName = './foo-bar-resolver-invalid'
    const testContext = utils.testContext({ 'i/resolver': resolverName })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }
    testContextReports.length = 0
    expect(
      resolve('../files/foo', {
        ...testContext,
        getFilename() {
          return utils.getFilename('foo.js')
        },
      }),
    ).toEqual(undefined)
    expect(testContextReports[0]).toMatchObject()
    expect(testContextReports[0].message).toEqual(
      `Resolve error: ${resolverName} with invalid interface loaded as resolver`,
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  it('respects i/resolve extensions - 1', function () {
    const testContext = utils.testContext({
      'i/resolve': { extensions: ['.jsx'] },
    })

    expect(resolve('./jsx/MyCoolComponent', testContext)).toEqual(
      utils.testFilePath('./jsx/MyCoolComponent.jsx'),
    )
  })

  it('reports load exception in a user resolver - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': './load-error-resolver',
    })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    expect(
      resolve('../files/exception', {
        ...testContext,
        getFilename() {
          return utils.getFilename('exception.js')
        },
      }),
    ).toEqual(undefined)
    expect(testContextReports[0]).toMatchObject()
    expect(replaceErrorStackForTest(testContextReports[0].message)).toEqual(
      'Resolve error: SyntaxError: TEST SYNTAX ERROR\n<stack-was-here>',
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

      it('resolves via a custom resolver with interface version 1 - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': './foo-bar-resolver-v1',
        })

        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(utils.testFilePath('./bar.jsx'))

        expect(
          resolve('../files/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toEqual(undefined)

        expect(
          resolve('../files/not-found', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('not-found.js')
            },
          }),
        ).toEqual(undefined)
      })

      it('resolves via a custom resolver with interface version 1 assumed if not specified - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': './foo-bar-resolver-no-version',
        })

        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(utils.testFilePath('./bar.jsx'))

        expect(
          resolve('../files/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toEqual(undefined)

        expect(
          resolve('../files/not-found', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('not-found.js')
            },
          }),
        ).toEqual(undefined)
      })

      it('resolves via a custom resolver with interface version 2 - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': './foo-bar-resolver-v2',
        })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }

        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(utils.testFilePath('./bar.jsx'))

        testContextReports.length = 0
        expect(
          resolve('../files/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toEqual(undefined)
        expect(testContextReports[0]).toMatchObject()
        expect(replaceErrorStackForTest(testContextReports[0].message)).toEqual(
          'Resolve error: foo-bar-resolver-v2 resolve test exception\n<stack-was-here>',
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

        testContextReports.length = 0
        expect(
          resolve('../files/not-found', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('not-found.js')
            },
          }),
        ).toEqual(undefined)
        expect(testContextReports.length).toEqual(0)
      })

      it('respects i/resolver as array of strings - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': ['./foo-bar-resolver-v2', './foo-bar-resolver-v1'],
        })

        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(utils.testFilePath('./bar.jsx'))
      })

      it('respects i/resolver as object - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': { './foo-bar-resolver-v2': {} },
        })

        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(utils.testFilePath('./bar.jsx'))
      })

      it('respects i/resolver as array of objects - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': [
            { './foo-bar-resolver-v2': {} },
            { './foo-bar-resolver-v1': {} },
          ],
        })

        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(utils.testFilePath('./bar.jsx'))
      })

      it('finds resolvers from the source files rather than eslint-module-utils - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': { foo: {} },
        })

        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(utils.testFilePath('./bar.jsx'))
      })

      it('reports invalid i/resolver config - 2', function () {
        const testContext = utils.testContext({ 'i/resolver': 123.456 })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }

        testContextReports.length = 0
        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(undefined)
        expect(testContextReports[0]).toMatchObject()
        expect(testContextReports[0].message).toEqual(
          'Resolve error: invalid resolver config',
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
      })

      it('reports loaded resolver with invalid interface - 2', function () {
        const resolverName = './foo-bar-resolver-invalid'
        const testContext = utils.testContext({
          'i/resolver': resolverName,
        })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }
        testContextReports.length = 0
        expect(
          resolve('../files/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('foo.js')
            },
          }),
        ).toEqual(undefined)
        expect(testContextReports[0]).toMatchObject()
        expect(testContextReports[0].message).toEqual(
          `Resolve error: ${resolverName} with invalid interface loaded as resolver`,
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
      })

      it('respects i/resolve extensions - 2', function () {
        const testContext = utils.testContext({
          'i/resolve': { extensions: ['.jsx'] },
        })

        expect(resolve('./jsx/MyCoolComponent', testContext)).toEqual(
          utils.testFilePath('./jsx/MyCoolComponent.jsx'),
        )
      })

      it('reports load exception in a user resolver - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': './load-error-resolver',
        })
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }

        expect(
          resolve('../files/exception', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
            getPhysicalFilename() {
              return utils.getFilename('exception.js')
            },
          }),
        ).toEqual(undefined)
        expect(testContextReports[0]).toMatchObject()
        expect(replaceErrorStackForTest(testContextReports[0].message)).toEqual(
          'Resolve error: SyntaxError: TEST SYNTAX ERROR\n<stack-was-here>',
        )
        expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
      })
    },
  )

  const caseDescribe = !CASE_SENSITIVE_FS ? describe : describe.skip
  caseDescribe('case sensitivity', function () {
    let file
    const testContext = utils.testContext({
      'i/resolve': { extensions: ['.jsx'] },
      'i/cache': { lifetime: 0 },
    })
    const testSettings = testContext.settings
    beforeEach('resolve', function () {
      file = resolve(
        // Note the case difference 'MyUncoolComponent' vs 'MyUnCoolComponent'
        './jsx/MyUncoolComponent',
        testContext,
      )
    })
    it('resolves regardless of case', function () {
      expect(
        file,
        // 'path to ./jsx/MyUncoolComponent'
      ).toBeDefined()
    })
    it('detects case does not match FS', function () {
      expect(fileExistsWithCaseSync(file, testSettings)).toBe(false)
    })
    it('detecting case does not include parent folder path (issue #720)', function () {
      const f = path.join(
        process.cwd().toUpperCase(),
        './tests/files/jsx/MyUnCoolComponent.jsx',
      )
      expect(fileExistsWithCaseSync(f, testSettings)).toBe(true)
    })
    it('detecting case should include parent folder path', function () {
      const f = path.join(
        process.cwd().toUpperCase(),
        './tests/files/jsx/MyUnCoolComponent.jsx',
      )
      expect(fileExistsWithCaseSync(f, testSettings, true)).toBe(false)
    })
  })

  describe('rename cache correctness', function () {
    const context = utils.testContext({
      'i/cache': { lifetime: 1 },
    })

    const infiniteContexts = ['∞', 'Infinity'].map(inf => [
      inf,
      utils.testContext({
        'i/cache': { lifetime: inf },
      }),
    ])

    const pairs = [['./CaseyKasem.js', './CASEYKASEM2.js']]

    pairs.forEach(([original, changed]) => {
      describe(`${original} => ${changed}`, function () {
        beforeEach('sanity check', function () {
          // eslint-disable-next-line jest/no-standalone-expect
          expect(resolve(original, context)).toBeDefined()
          // eslint-disable-next-line jest/no-standalone-expect
          expect(resolve(changed, context)).not.toBeDefined()
        })

        // settings are part of cache key
        beforeEach('warm up infinite entries', function () {
          infiniteContexts.forEach(([, c]) => {
            // eslint-disable-next-line jest/no-standalone-expect
            expect(resolve(original, c)).toBeDefined()
          })
        })

        beforeEach('rename', () =>
          fs.rename(utils.testFilePath(original), utils.testFilePath(changed)),
        )

        beforeEach('verify rename', () => fs.stat(utils.testFilePath(changed)))

        it('gets cached values within cache lifetime', function () {
          // get cached values initially
          expect(resolve(original, context)).toBeDefined()
        })

        it('gets updated values immediately', function () {
          // get cached values initially
          expect(resolve(changed, context)).toBeDefined()
        })

        // special behavior for infinity
        describe('infinite cache', function () {
          this.timeout(1.5e3)

          beforeEach(() => setTimeout(1100))

          infiniteContexts.forEach(([inf, infiniteContext]) => {
            it(`lifetime: ${inf} still gets cached values after ~1s`, function () {
              expect(
                resolve(original, infiniteContext),
                // original
              ).toBeDefined()
            })
          })
        })

        describe('finite cache', function () {
          this.timeout(1.2e3)
          beforeEach(() => setTimeout(1000))
          it('gets correct values after cache lifetime', function () {
            expect(resolve(original, context)).not.toBeDefined()
            expect(resolve(changed, context)).toBeDefined()
          })
        })

        afterEach('restore original case', () =>
          fs.rename(utils.testFilePath(changed), utils.testFilePath(original)),
        )
      })
    })
  })
})
