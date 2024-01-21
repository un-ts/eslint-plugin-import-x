import fs from 'fs/promises'
import path from 'path'
import { setTimeout } from 'timers/promises'

import eslintPkg from 'eslint/package.json'
import semver from 'semver'

import * as utils from '../utils'

import resolve, {
  CASE_SENSITIVE_FS,
  fileExistsWithCaseSync,
} from 'eslint-module-utils/resolve'

function unexpectedCallToGetFilename() {
  throw new Error(
    'Expected to call to getPhysicalFilename() instead of getFilename()',
  )
}

describe('resolve', function () {
  it('throws on bad parameters', function () {
    expect(resolve.bind(null, null, null)).toThrow()
  })

  it('respects i/resolver as object - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': {},
    })

    expect(resolve('../fixtures/bar', testContext)).toEqual(
      utils.testFilePath('./bar.js'),
    )
  })

  it('reports invalid i/resolver config', function () {
    const testContext = utils.testContext({ 'i/resolver': 123.456 })
    const testContextReports = []
    testContext.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    expect(resolve('../fixtures/foo', testContext)).toBeUndefined()
    expect(testContextReports[0]).toMatchObject({
      loc: { line: 1, column: 0 },
    })
    expect(testContextReports[0].message).toContain(
      'Resolve error: Expected `resolver` setting to be an options object, got `number`',
    )
  })

  it('respects i/resolve extensions - 1', function () {
    const testContext = utils.testContext({
      'i/resolver': { extensions: ['.jsx'] },
    })

    expect(resolve('./bar', testContext)).toEqual(
      utils.testFilePath('./bar.jsx'),
    )

    expect(resolve('./jsx/MyCoolComponent', testContext)).toEqual(
      utils.testFilePath('./jsx/MyCoolComponent.jsx'),
    )
  })

  // context.getPhysicalFilename() is available in ESLint 7.28+
  ;(semver.satisfies(eslintPkg.version, '>= 7.28') ? describe : describe.skip)(
    'getPhysicalFilename()',
    () => {
      it('resolves via a custom resolver with interface version 1 - 2', function () {
        const testContext = {
          ...utils.testContext(null, true),
          getFilename: unexpectedCallToGetFilename,
        }

        expect(resolve('../fixtures/bar', testContext)).toEqual(
          utils.testFilePath('./bar.js'),
        )

        expect(resolve('../fixtures/exception', testContext)).toBeUndefined()

        expect(resolve('../fixtures/not-found', testContext)).toBeUndefined()
      })

      it('respects i/resolver as object - 2', function () {
        const testContext = utils.testContext({}, true)

        expect(
          resolve('../fixtures/bar', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
          }),
        ).toEqual(utils.testFilePath('./bar.js'))
      })

      it('reports invalid i/resolver config - 2', function () {
        const testContext = utils.testContext({ 'i/resolver': 123.456 }, true)
        const testContextReports = []
        testContext.report = function (reportInfo) {
          testContextReports.push(reportInfo)
        }

        testContextReports.length = 0
        expect(
          resolve('../fixtures/foo', {
            ...testContext,
            getFilename: unexpectedCallToGetFilename,
          }),
        ).toBeUndefined()
        expect(testContextReports[0]).toMatchObject({
          loc: { line: 1, column: 0 },
        })
        expect(testContextReports[0].message).toContain(
          'Resolve error: Expected `resolver` setting to be an options object, got `number`',
        )
      })

      it('respects i/resolve extensions - 2', function () {
        const testContext = utils.testContext({
          'i/resolver': { extensions: ['.jsx'] },
        })

        expect(resolve('./bar', testContext)).toEqual(
          utils.testFilePath('./bar.jsx'),
        )

        expect(resolve('./jsx/MyCoolComponent', testContext)).toEqual(
          utils.testFilePath('./jsx/MyCoolComponent.jsx'),
        )
      })
    },
  )

  const caseDescribe = CASE_SENSITIVE_FS ? describe.skip : describe
  caseDescribe('case sensitivity', function () {
    let file
    const testContext = utils.testContext({
      'i/resolver': { extensions: ['.jsx'] },
      'i/cache': { lifetime: 0 },
    })
    const testSettings = testContext.settings
    beforeEach(
      // 'resolve',
      function () {
        file = resolve(
          // Note the case difference 'MyUncoolComponent' vs 'MyUnCoolComponent'
          './jsx/MyUncoolComponent',
          testContext,
        )
      },
    )
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
        './test/fixtures/jsx/MyUnCoolComponent.jsx',
      )
      expect(fileExistsWithCaseSync(f, testSettings)).toBe(true)
    })
    it('detecting case should include parent folder path', function () {
      const f = path.join(
        process.cwd().toUpperCase(),
        './test/fixtures/jsx/MyUnCoolComponent.jsx',
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

    for (const [original, changed] of pairs) {
      describe(`${original} => ${changed}`, function () {
        beforeEach(
          // 'sanity check',
          function () {
            // eslint-disable-next-line jest/no-standalone-expect
            expect(resolve(original, context)).toBeDefined()
            // eslint-disable-next-line jest/no-standalone-expect
            expect(resolve(changed, context)).not.toBeDefined()
          },
        )

        // settings are part of cache key
        beforeEach(
          // 'warm up infinite entries',
          function () {
            for (const [, c] of infiniteContexts) {
              // eslint-disable-next-line jest/no-standalone-expect
              expect(resolve(original, c)).toBeDefined()
            }
          },
        )

        beforeEach(
          // 'rename',
          () =>
            fs.rename(
              utils.testFilePath(original),
              utils.testFilePath(changed),
            ),
        )

        beforeEach(
          // 'verify rename',
          () => fs.stat(utils.testFilePath(changed)),
        )

        it('gets cached values within cache lifetime', function () {
          // get cached values initially
          expect(resolve(original, context)).toBeDefined()
        })

        // eslint-disable-next-line jest/no-commented-out-tests -- not working correctly
        // it('gets updated values immediately', function () {
        //   // get cached values initially
        //   expect(resolve(changed, context)).toBeDefined()
        // })

        // special behavior for infinity
        describe('infinite cache', function () {
          jest.setTimeout(1.5e3)

          beforeEach(() => setTimeout(1100))

          for (const [inf, infiniteContext] of infiniteContexts) {
            it(`lifetime: ${inf} still gets cached values after ~1s`, function () {
              expect(resolve(original, infiniteContext)).toBeDefined()
            })
          }
        })

        // eslint-disable-next-line jest/no-commented-out-tests -- not working correctly
        // describe('finite cache', function () {
        //   jest.setTimeout(1.2e3)

        //   beforeEach(() => setTimeout(1000))

        // eslint-disable-next-line jest/no-commented-out-tests -- not working correctly
        // it('gets correct values after cache lifetime', function () {
        //   expect(resolve(original, context)).not.toBeDefined()
        //   expect(resolve(changed, context)).toBeDefined()
        // })
        // })

        afterEach(
          // 'restore original case',
          () =>
            fs.rename(
              utils.testFilePath(changed),
              utils.testFilePath(original),
            ),
        )
      })
    }
  })
})
