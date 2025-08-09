import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { setTimeout } from 'node:timers/promises'

import { jest } from '@jest/globals'
import type { TSESLint } from '@typescript-eslint/utils'

import { TEST_FILENAME, testContext, testFilePath } from '../utils.js'

import { cjsRequire, importXResolverCompat } from 'eslint-plugin-import-x'
import type {
  CjsRequire,
  NewResolver,
  NormalizedCacheSettings,
  RuleContext,
} from 'eslint-plugin-import-x'
import {
  CASE_SENSITIVE_FS,
  fileExistsWithCaseSync,
  relative,
  resolve,
} from 'eslint-plugin-import-x/utils'

const require: CjsRequire = createRequire(import.meta.url)

describe('resolve', () => {
  it('throws on bad parameters', () => {
    expect(
      resolve.bind(
        null,
        // @ts-expect-error - testing
        null,
        null,
      ),
    ).toThrow()
  })

  it('resolves via a custom resolver with interface version 1', () => {
    const context = testContext({
      'import-x/resolver': './foo-bar-resolver-v1',
    })

    expect(resolve('../fixtures/foo', context)).toBe(testFilePath('./bar.jsx'))

    expect(
      resolve('../fixtures/exception', {
        ...context,
        physicalFilename: testFilePath('exception.js'),
      }),
    ).toBeUndefined()

    expect(
      resolve('../fixtures/not-found', {
        ...context,
        physicalFilename: testFilePath('not-found.js'),
      }),
    ).toBeUndefined()
  })

  it('resolves via a custom resolver with interface version 1 assumed if not specified', () => {
    const context = testContext({
      'import-x/resolver': './foo-bar-resolver-no-version',
    })

    expect(resolve('../fixtures/foo', context)).toBe(testFilePath('./bar.jsx'))

    expect(
      resolve('../fixtures/exception', {
        ...context,
        physicalFilename: testFilePath('exception.js'),
      }),
    ).toBeUndefined()

    expect(
      resolve('../fixtures/not-found', {
        ...context,
        physicalFilename: testFilePath('not-found.js'),
      }),
    ).toBeUndefined()
  })

  it('resolves via a custom resolver with interface version 2', () => {
    const context = testContext({
      'import-x/resolver': './foo-bar-resolver-v2',
    })
    const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []
    context.report = reportInfo => {
      testContextReports.push(reportInfo)
    }

    expect(resolve('../fixtures/foo', context)).toBe(testFilePath('./bar.jsx'))

    testContextReports.length = 0
    expect(
      resolve('../fixtures/exception', {
        ...context,
        physicalFilename: testFilePath('exception.js'),
      }),
    ).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(
      'message' in testContextReports[0] && testContextReports[0].message,
    ).toMatch('Resolve error: foo-bar-resolver-v2 resolve test exception')
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

    testContextReports.length = 0
    expect(
      resolve('../fixtures/not-found', {
        ...context,
        physicalFilename: testFilePath('not-found.js'),
      }),
    ).toBeUndefined()
    expect(testContextReports.length).toBe(0)
  })

  it('resolves via a custom resolver with interface version 3', () => {
    const context = testContext({
      'import-x/resolver-next': [
        require<{
          foobarResolver: NewResolver
        }>('../fixtures/foo-bar-resolver-v3').foobarResolver,
      ],
    })
    const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []
    context.report = reportInfo => {
      testContextReports.push(reportInfo)
    }

    expect(resolve('../fixtures/foo', context)).toBe(testFilePath('./bar.jsx'))

    testContextReports.length = 0
    expect(
      resolve('../fixtures/exception', {
        ...context,
        physicalFilename: testFilePath('exception.js'),
      }),
    ).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(
      'message' in testContextReports[0] && testContextReports[0].message,
    ).toMatch('Resolve error: foo-bar-resolver-v3 resolve test exception')
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

    testContextReports.length = 0
    expect(
      resolve('../fixtures/not-found', {
        ...context,
        physicalFilename: testFilePath('not-found.js'),
      }),
    ).toBeUndefined()
    expect(testContextReports.length).toBe(0)
  })

  it('importXResolverCompat()', () => {
    let context = testContext({
      'import-x/resolver-next': [
        importXResolverCompat(require('../fixtures/foo-bar-resolver-v2')),
      ],
    })
    expect(resolve('../fixtures/foo', context)).toBe(testFilePath('./bar.jsx'))

    context = testContext({
      'import-x/resolver-next': [
        importXResolverCompat(require('../fixtures/foo-bar-resolver-v1')),
      ],
    })
    expect(resolve('../fixtures/foo', context)).toBe(testFilePath('./bar.jsx'))
  })

  it('non-array resolver interface v3', () => {
    const context = testContext({
      'import-x/resolver-next': require<{
        foobarResolver: NewResolver
      }>('../fixtures/foo-bar-resolver-v3').foobarResolver,
    })
    expect(resolve('../fixtures/foo', context)).toBe(testFilePath('./bar.jsx'))
  })

  it('reports invalid import-x/resolver config', () => {
    const context = testContext({
      // @ts-expect-error - testing
      'import-x/resolver': 123.456,
    })

    const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []

    context.report = reportInfo => {
      testContextReports.push(reportInfo)
    }

    testContextReports.length = 0
    expect(resolve('../fixtures/foo', context)).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(
      'message' in testContextReports[0] && testContextReports[0].message,
    ).toMatch('Resolve error: invalid resolver config')
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  it('reports loaded resolver with invalid interface', () => {
    const resolverName = './foo-bar-resolver-invalid'
    const context = testContext({ 'import-x/resolver': resolverName })

    const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []

    context.report = function (reportInfo) {
      testContextReports.push(reportInfo)
    }

    expect(resolve('../fixtures/foo', context)).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(
      'message' in testContextReports[0] && testContextReports[0].message,
    ).toMatch(
      `Resolve error: ${resolverName} with invalid interface loaded as resolver`,
    )
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  it('respects import-x/resolve extensions', () => {
    const context = testContext({
      'import-x/resolve': { extensions: ['.jsx'] },
    })

    expect(resolve('./jsx/MyCoolComponent', context)).toBe(
      testFilePath('./jsx/MyCoolComponent.jsx'),
    )
  })

  it('reports load exception in a user resolver', () => {
    const context = testContext({
      'import-x/resolver': './load-error-resolver',
    })

    const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []

    context.report = reportInfo => {
      testContextReports.push(reportInfo)
    }

    expect(
      resolve('../fixtures/exception', {
        ...context,
        physicalFilename: testFilePath('exception.js'),
      }),
    ).toBeUndefined()
    expect(testContextReports[0]).toBeInstanceOf(Object)
    expect(
      'message' in testContextReports[0] && testContextReports[0].message,
    ).toMatch('Resolve error: SyntaxError: TEST SYNTAX ERROR')
    expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
  })

  describe('getPhysicalFilename()', () => {
    it('resolves via a custom resolver with interface version 1', () => {
      const context = testContext({
        'import-x/resolver': './foo-bar-resolver-v1',
      })

      expect(resolve('../fixtures/foo', context)).toBe(
        testFilePath('./bar.jsx'),
      )

      expect(
        resolve('../fixtures/exception', {
          ...context,
          physicalFilename: testFilePath('exception.js'),
        }),
      ).toBeUndefined()

      expect(
        resolve('../fixtures/not-found', {
          ...context,
          physicalFilename: testFilePath('not-found.js'),
        }),
      ).toBeUndefined()
    })

    it('resolves via a custom resolver with interface version 1 assumed if not specified', () => {
      const context = testContext({
        'import-x/resolver': './foo-bar-resolver-no-version',
      })

      expect(resolve('../fixtures/foo', context)).toBe(
        testFilePath('./bar.jsx'),
      )

      expect(
        resolve('../fixtures/exception', {
          ...context,
          physicalFilename: testFilePath('exception.js'),
        }),
      ).toBeUndefined()

      expect(
        resolve('../fixtures/not-found', {
          ...context,
          physicalFilename: testFilePath('not-found.js'),
        }),
      ).toBeUndefined()
    })

    it('resolves via a custom resolver with interface version 2', () => {
      const context = testContext({
        'import-x/resolver': './foo-bar-resolver-v2',
      })
      const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []
      context.report = reportInfo => {
        testContextReports.push(reportInfo)
      }

      expect(resolve('../fixtures/foo', context)).toBe(
        testFilePath('./bar.jsx'),
      )

      testContextReports.length = 0
      expect(
        resolve('../fixtures/exception', {
          ...context,
          physicalFilename: testFilePath('exception.js'),
        }),
      ).toBeUndefined()
      expect(testContextReports[0]).toBeInstanceOf(Object)
      expect(
        'message' in testContextReports[0] && testContextReports[0].message,
      ).toMatch('Resolve error: foo-bar-resolver-v2 resolve test exception')
      expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

      testContextReports.length = 0
      expect(
        resolve('../fixtures/not-found', {
          ...context,
          physicalFilename: testFilePath('not-found.js'),
        }),
      ).toBeUndefined()
      expect(testContextReports.length).toBe(0)
    })

    it('resolves via a custom resolver with interface version 3', () => {
      const context = testContext({
        'import-x/resolver-next': [
          require<{
            foobarResolver: NewResolver
          }>('../fixtures/foo-bar-resolver-v3').foobarResolver,
        ],
      })
      const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []
      context.report = reportInfo => {
        testContextReports.push(reportInfo)
      }

      expect(resolve('../fixtures/foo', context)).toBe(
        testFilePath('./bar.jsx'),
      )

      testContextReports.length = 0
      expect(
        resolve('../fixtures/exception', {
          ...context,
          physicalFilename: testFilePath('exception.js'),
        }),
      ).toBeUndefined()
      expect(testContextReports[0]).toBeInstanceOf(Object)
      expect(
        'message' in testContextReports[0] && testContextReports[0].message,
      ).toMatch('Resolve error: foo-bar-resolver-v3 resolve test exception')
      expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })

      testContextReports.length = 0
      expect(
        resolve('../fixtures/not-found', {
          ...context,
          physicalFilename: testFilePath('not-found.js'),
        }),
      ).toBeUndefined()
      expect(testContextReports.length).toBe(0)
    })

    it('reports invalid import-x/resolver config', () => {
      const context = testContext({
        // @ts-expect-error - testing
        'import-x/resolver': 123.456,
      })
      const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []
      context.report = reportInfo => {
        testContextReports.push(reportInfo)
      }

      testContextReports.length = 0
      expect(resolve('../fixtures/foo', context)).toBeUndefined()
      expect(testContextReports[0]).toBeInstanceOf(Object)
      expect(
        'message' in testContextReports[0] && testContextReports[0].message,
      ).toMatch('Resolve error: invalid resolver config')
      expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
    })

    it('reports loaded resolver with invalid interface', () => {
      const resolverName = './foo-bar-resolver-invalid'
      const context = testContext({
        'import-x/resolver': resolverName,
      })
      const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []
      context.report = reportInfo => {
        testContextReports.push(reportInfo)
      }
      expect(resolve('../fixtures/foo', context)).toBeUndefined()
      expect(testContextReports[0]).toBeInstanceOf(Object)
      expect(
        'message' in testContextReports[0] && testContextReports[0].message,
      ).toMatch(
        `Resolve error: ${resolverName} with invalid interface loaded as resolver`,
      )
      expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
    })

    it('respects import-x/resolve extensions', () => {
      const context = testContext({
        'import-x/resolve': { extensions: ['.jsx'] },
      })

      expect(resolve('./jsx/MyCoolComponent', context)).toBe(
        testFilePath('./jsx/MyCoolComponent.jsx'),
      )
    })

    it('reports load exception in a user resolver', () => {
      const context = testContext({
        'import-x/resolver': './load-error-resolver',
      })
      const testContextReports: Array<TSESLint.ReportDescriptor<string>> = []
      context.report = reportInfo => {
        testContextReports.push(reportInfo)
      }

      expect(
        resolve('../fixtures/exception', {
          ...context,
          physicalFilename: testFilePath('exception.js'),
        }),
      ).toBeUndefined()
      expect(testContextReports[0]).toBeInstanceOf(Object)
      expect(
        'message' in testContextReports[0] && testContextReports[0].message,
      ).toMatch('Resolve error: SyntaxError: TEST SYNTAX ERROR')
      expect(testContextReports[0].loc).toEqual({ line: 1, column: 0 })
    })
  })

  const caseDescribe = CASE_SENSITIVE_FS ? describe.skip : describe

  caseDescribe('case sensitivity', () => {
    const context = testContext({
      'import-x/resolve': { extensions: ['.jsx'] },
      'import-x/cache': { lifetime: 0 },
    })

    const cacheSettings = context.settings[
      'import-x/cache'
    ] as NormalizedCacheSettings

    const file = resolve(
      // Note the case difference 'MyUncoolComponent' vs 'MyUnCoolComponent'
      './jsx/MyUncoolComponent',
      context,
    )!

    it('resolves regardless of case', () => {
      // path to ./jsx/MyUncoolComponent
      expect(file).toBeDefined()
    })

    it('detects case does not match FS', () => {
      expect(fileExistsWithCaseSync(file, cacheSettings)).toBe(false)
    })

    it('detecting case does not include parent folder path (issue #720)', () => {
      const f = path.resolve(
        process.cwd().toUpperCase(),
        './test/fixtures/jsx/MyUnCoolComponent.jsx',
      )
      expect(fileExistsWithCaseSync(f, cacheSettings)).toBe(true)
    })

    it('detecting case should include parent folder path', () => {
      const f = path.resolve(
        process.cwd().toUpperCase(),
        './test/fixtures/jsx/MyUnCoolComponent.jsx',
      )
      expect(fileExistsWithCaseSync(f, cacheSettings, true)).toBe(false)
    })
  })

  describe('rename cache correctness', () => {
    const context = testContext({
      'import-x/cache': { lifetime: 1 },
    })

    const infiniteContexts = (['∞', 'Infinity'] as const).map(
      inf =>
        [
          inf,
          testContext({
            'import-x/cache': { lifetime: inf },
          }),
        ] as const,
    )

    const pairs = [['./CaseyKasem.js', './CASEYKASEM2.js']]

    for (const [original, changed] of pairs) {
      describe(`${original} => ${changed}`, () => {
        beforeAll(() => {
          expect(resolve(original, context)).toBeDefined()
          expect(resolve(changed, context)).toBeFalsy()

          // settings are part of cache key
          for (const [, c] of infiniteContexts) {
            expect(resolve(original, c)).toBeDefined()
          }
        })

        beforeAll(() =>
          fs.promises.rename(testFilePath(original), testFilePath(changed)),
        )

        beforeAll(() => {
          const exists = fs.existsSync(testFilePath(changed))
          if (!exists) {
            throw new Error('new file does not exist')
          }
        })

        afterAll(() =>
          fs.promises.rename(testFilePath(changed), testFilePath(original)),
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

          beforeAll(() => setTimeout(1100))

          for (const [inf, infiniteContext] of infiniteContexts) {
            it(`lifetime: ${inf} still gets cached values after ~1s`, () => {
              // original
              expect(resolve(original, infiniteContext)).toBeDefined()
            })
          }
        })

        describe('finite cache', () => {
          jest.setTimeout(1.2e3)
          beforeAll(() => setTimeout(1000))
          it('gets correct values after cache lifetime', () => {
            expect(resolve(original, context)).toBeFalsy()
            expect(resolve(changed, context)).toBeDefined()
          })
        })
      })
    }
  })

  describe('respects import-x/resolver', () => {
    it('as resolver package name(s)', () => {
      expect(
        resolve(
          '../fixtures/foo',
          testContext({ 'import-x/resolver': { 'foo-v2': {} } }),
        ),
      ).toBe(testFilePath('./bar.jsx'))

      expect(
        resolve(
          '../fixtures/foo',
          testContext({
            'import-x/resolver': [{ 'foo-v2': {} }, { 'foo-v1': {} }],
          }),
        ),
      ).toBe(testFilePath('./bar.jsx'))
    })

    it('as resolver file path(s)', () => {
      expect(
        resolve(
          '../fixtures/foo',
          testContext({
            'import-x/resolver': './foo-bar-resolver-v2',
          }),
        ),
      ).toBe(testFilePath('./bar.jsx'))

      expect(
        resolve(
          '../fixtures/foo',
          testContext({
            'import-x/resolver': [
              './foo-bar-resolver-v2',
              './foo-bar-resolver-v1',
            ],
          }),
        ),
      ).toBe(testFilePath('./bar.jsx'))
    })

    it('as resolver record(s)', () => {
      expect(
        resolve(
          '../fixtures/foo',
          testContext({
            'import-x/resolver': { './foo-bar-resolver-v2': {} },
          }),
        ),
      ).toBe(testFilePath('./bar.jsx'))

      expect(
        resolve(
          '../fixtures/foo',
          testContext({
            'import-x/resolver': [
              { './foo-bar-resolver-v2': {} },
              { './foo-bar-resolver-v1': {} },
            ],
          }),
        ),
      ).toBe(testFilePath('./bar.jsx'))
    })

    it('as resolver object(s)', async () => {
      // @ts-expect-error - no types for resolver
      const resolverV1 = await import('../fixtures/foo-bar-resolver-v1.js')
      // @ts-expect-error - no types for resolver
      const resolverV2 = await import('../fixtures/foo-bar-resolver-v2.js')

      expect(
        resolve(
          '../fixtures/foo',
          testContext({
            'import-x/resolver': {
              name: 'foo-bar-resolver-v2',
              resolver: resolverV2,
            },
          }),
        ),
      ).toBe(testFilePath('./bar.jsx'))

      expect(
        resolve(
          '../fixtures/foo',
          testContext({
            'import-x/resolver': [
              {
                name: 'foo-bar-resolver-v2',
                resolver: resolverV2,
              },
              {
                name: 'foo-bar-resolver-v1',
                resolver: resolverV1,
              },
            ],
          }),
        ),
      ).toBe(testFilePath('./bar.jsx'))
    })

    describe('getPhysicalFilename()', () => {
      it('as resolver package name(s)', () => {
        expect(
          resolve(
            '../fixtures/foo',
            testContext({ 'import-x/resolver': { 'foo-v2': {} } }),
          ),
        ).toBe(testFilePath('./bar.jsx'))

        expect(
          resolve(
            '../fixtures/foo',
            testContext({
              'import-x/resolver': [{ 'foo-v2': {} }, { 'foo-v1': {} }],
            }),
          ),
        ).toBe(testFilePath('./bar.jsx'))
      })

      it('as resolver file path(s)', () => {
        expect(
          resolve(
            '../fixtures/foo',
            testContext({
              'import-x/resolver': './foo-bar-resolver-v2',
            }),
          ),
        ).toBe(testFilePath('./bar.jsx'))

        expect(
          resolve(
            '../fixtures/foo',
            testContext({
              'import-x/resolver': [
                './foo-bar-resolver-v2',
                './foo-bar-resolver-v1',
              ],
            }),
          ),
        ).toBe(testFilePath('./bar.jsx'))
      })

      it('as resolver record(s)', () => {
        expect(
          resolve(
            '../fixtures/foo',
            testContext({
              'import-x/resolver': { './foo-bar-resolver-v2': {} },
            }),
          ),
        ).toBe(testFilePath('./bar.jsx'))

        expect(
          resolve(
            '../fixtures/foo',
            testContext({
              'import-x/resolver': [
                { './foo-bar-resolver-v2': {} },
                { './foo-bar-resolver-v1': {} },
              ],
            }),
          ),
        ).toBe(testFilePath('./bar.jsx'))
      })

      it('as resolver object(s)', async () => {
        // @ts-expect-error - no types for resolver
        const resolverV1 = await import('../fixtures/foo-bar-resolver-v1.js')
        // @ts-expect-error - no types for resolver
        const resolverV2 = await import('../fixtures/foo-bar-resolver-v2.js')

        expect(
          resolve(
            '../fixtures/foo',
            testContext({
              'import-x/resolver': {
                name: 'foo-bar-resolver-v2',
                resolver: resolverV2,
              },
            }),
          ),
        ).toBe(testFilePath('./bar.jsx'))

        expect(
          resolve(
            '../fixtures/foo',
            testContext({
              'import-x/resolver': [
                {
                  name: 'foo-bar-resolver-v2',
                  resolver: resolverV2,
                },
                {
                  name: 'foo-bar-resolver-v1',
                  resolver: resolverV1,
                },
              ],
            }),
          ),
        ).toBe(testFilePath('./bar.jsx'))
      })
    })

    it('respect project setting', () => {
      const tsconfigRootDir = testFilePath('')
      expect(
        resolve('../fixtures/foo', {
          ...testContext({
            'import-x/resolver': './foo-bar-resolver-no-version',
          }),
          languageOptions: {
            parserOptions: {
              project: tsconfigRootDir,
              tsconfigRootDir,
            },
          },
        }),
      ).toBe(testFilePath('./bar.tsx'))
      expect(
        resolve('../fixtures/foo', {
          ...testContext({
            'import-x/resolver': './foo-bar-resolver-v1',
          }),
          languageOptions: {
            parserOptions: {
              project: true,
            },
          },
        }),
      ).toBe(testFilePath('./bar.tsx'))
      expect(
        resolve('../fixtures/foo', {
          ...testContext({
            'import-x/resolver': './foo-bar-resolver-v2',
          }),
          languageOptions: {
            parserOptions: {
              project: testFilePath('tsconfig.json'),
            },
          },
        }),
      ).toBe(testFilePath('./bar.tsx'))
      expect(
        resolve('../fixtures/foo', {
          ...testContext({
            'import-x/resolver-next': require<{
              foobarResolver: NewResolver
            }>('../fixtures/foo-bar-resolver-v3').foobarResolver,
          }),
          languageOptions: {
            parserOptions: {
              project: true,
              tsconfigRootDir,
            },
          },
        }),
      ).toBe(testFilePath('./bar.tsx'))
    })

    it('sourceFile should take higher priority than context.physicalFilename', () => {
      const sourceFile = cjsRequire.resolve('typescript-eslint')
      expect(
        relative('./config-helper', sourceFile, {}, {
          physicalFilename: TEST_FILENAME,
          settings: {},
        } as RuleContext),
      ).toBe(path.resolve(sourceFile, '../config-helper.js'))
    })
  })
})
