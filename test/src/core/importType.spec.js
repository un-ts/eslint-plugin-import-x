import path from 'path'
import { isBuiltin } from 'module'

import importType, {
  isExternalModule,
  isScoped,
  isAbsolute,
} from 'core/importType'

import { testContext, testFilePath } from '../utils'

describe('importType(name)', function () {
  const context = testContext()
  const pathToTestFiles = path.join(__dirname, '..', '..', 'files')

  it("should return 'absolute' for paths starting with a /", function () {
    expect(importType('/', context)).toEqual('absolute')
    expect(importType('/path', context)).toEqual('absolute')
    expect(importType('/some/path', context)).toEqual('absolute')
  })

  it("should return 'builtin' for node.js modules", function () {
    ;['fs', 'fs/promises', 'path']
      .filter(x => isBuiltin(x))
      .forEach(x => {
        expect(importType(x, context)).toEqual('builtin')
        if (isBuiltin(`node:${x}`)) {
          // eslint-disable-next-line jest/no-conditional-expect
          expect(importType(`node:${x}`, context)).toEqual('builtin')
        }
      })
  })

  it("should return 'external' for non-builtin modules without a relative path", function () {
    expect(importType('lodash', context)).toEqual('external')
    expect(importType('async', context)).toEqual('external')
    expect(importType('chalk', context)).toEqual('external')
    expect(importType('foo', context)).toEqual('external')
    expect(importType('lodash.find', context)).toEqual('external')
    expect(importType('lodash/fp', context)).toEqual('external')
  })

  it("should return 'external' for scopes packages", function () {
    expect(importType('@cycle/', context)).toEqual('external')
    expect(importType('@cycle/core', context)).toEqual('external')
    expect(importType('@cycle/dom', context)).toEqual('external')
    expect(importType('@some-thing/something', context)).toEqual('external')
    expect(importType('@some-thing/something/some-module', context)).toEqual(
      'external',
    )
    expect(
      importType('@some-thing/something/some-directory/someModule.js', context),
    ).toEqual('external')
  })

  it("should return 'external' for external modules that redirect to its parent module using package.json", function () {
    expect(
      importType('eslint-import-test-order-redirect/module', context),
    ).toEqual('external')
    expect(
      importType('@eslint/import-test-order-redirect-scoped/module', context),
    ).toEqual('external')
  })

  it("should return 'internal' for non-builtins resolved outside of node_modules", function () {
    const pathContext = testContext({
      'i/resolver': { node: { paths: [pathToTestFiles] } },
    })
    expect(importType('importType', pathContext)).toEqual('internal')
  })

  it("should return 'internal' for scoped packages resolved outside of node_modules", function () {
    const pathContext = testContext({
      'i/resolver': { node: { paths: [pathToTestFiles] } },
    })
    expect(importType('@importType/index', pathContext)).toEqual('internal')
  })

  it("should return 'internal' for internal modules that are referenced by aliases", function () {
    const pathContext = testContext({
      'i/resolver': { node: { paths: [pathToTestFiles] } },
    })
    expect(importType('@my-alias/fn', pathContext)).toEqual('internal')
    expect(importType('@importType', pathContext)).toEqual('internal')
  })

  it("should return 'internal' for aliased internal modules that look like core modules (node resolver)", function () {
    const pathContext = testContext({
      'i/resolver': { node: { paths: [pathToTestFiles] } },
    })
    expect(importType('constants/index', pathContext)).toEqual('internal')
    expect(importType('constants/', pathContext)).toEqual('internal')
    // resolves exact core modules over internal modules
    expect(importType('constants', pathContext)).toEqual('builtin')
  })

  it("should return 'internal' for aliased internal modules that look like core modules (webpack resolver)", function () {
    const webpackConfig = {
      resolve: { modules: [pathToTestFiles, 'node_modules'] },
    }
    const pathContext = testContext({
      'i/resolver': { webpack: { config: webpackConfig } },
    })
    expect(importType('constants/index', pathContext)).toEqual('internal')
    expect(importType('constants/', pathContext)).toEqual('internal')
    expect(importType('constants', pathContext)).toEqual('internal')
  })

  it("should return 'internal' for aliased internal modules that are found, even if they are not discernible as scoped", function () {
    // `@` for internal modules is a common alias and is different from scoped names.
    // Scoped names are prepended with `@` (e.g. `@scoped/some-file.js`) whereas `@`
    // as an alias by itelf is the full root name (e.g. `@/some-file.js`).
    const alias = { '@': path.join(pathToTestFiles, 'internal-modules') }
    const webpackConfig = { resolve: { alias } }
    const pathContext = testContext({
      'i/resolver': { webpack: { config: webpackConfig } },
    })
    expect(importType('@/api/service', pathContext)).toEqual('internal')
    expect(importType('@/does-not-exist', pathContext)).toEqual('unknown')
  })

  it("should return 'parent' for internal modules that go through the parent", function () {
    expect(importType('../foo', context)).toEqual('parent')
    expect(importType('../../foo', context)).toEqual('parent')
    expect(importType('../bar/foo', context)).toEqual('parent')
  })

  it("should return 'sibling' for internal modules that are connected to one of the siblings", function () {
    expect(importType('./foo', context)).toEqual('sibling')
    expect(importType('./foo/bar', context)).toEqual('sibling')
    expect(importType('./importType', context)).toEqual('sibling')
    expect(importType('./importType/', context)).toEqual('sibling')
    expect(importType('./importType/index', context)).toEqual('sibling')
    expect(importType('./importType/index.js', context)).toEqual('sibling')
  })

  it("should return 'index' for sibling index file", function () {
    expect(importType('.', context)).toEqual('index')
    expect(importType('./', context)).toEqual('index')
    expect(importType('./index', context)).toEqual('index')
    expect(importType('./index.js', context)).toEqual('index')
  })

  it("should return 'unknown' for any unhandled cases", function () {
    expect(importType('  /malformed', context)).toEqual('unknown')
    expect(importType('   foo', context)).toEqual('unknown')
    expect(importType('-/no-such-path', context)).toEqual('unknown')
  })

  it("should return 'builtin' for additional core modules", function () {
    // without extra config, should be marked external
    expect(importType('electron', context)).toEqual('external')
    expect(importType('@org/foobar', context)).toEqual('external')

    const electronContext = testContext({ 'i/core-modules': ['electron'] })
    expect(importType('electron', electronContext)).toEqual('builtin')

    const scopedContext = testContext({
      'i/core-modules': ['@org/foobar'],
    })
    expect(importType('@org/foobar', scopedContext)).toEqual('builtin')
  })

  it("should return 'builtin' for resources inside additional core modules", function () {
    const electronContext = testContext({ 'i/core-modules': ['electron'] })
    expect(
      importType('electron/some/path/to/resource.json', electronContext),
    ).toEqual('builtin')

    const scopedContext = testContext({
      'i/core-modules': ['@org/foobar'],
    })
    expect(
      importType('@org/foobar/some/path/to/resource.json', scopedContext),
    ).toEqual('builtin')
  })

  it("should return 'external' for module from 'node_modules' with default config", function () {
    expect(importType('resolve', context)).toEqual('external')
  })

  it("should return 'internal' for module from 'node_modules' if 'node_modules' missed in 'external-module-folders'", function () {
    const foldersContext = testContext({ 'i/external-module-folders': [] })
    expect(importType('chai', foldersContext)).toEqual('internal')
  })

  it("should return 'internal' for module from 'node_modules' if its name matched 'internal-regex'", function () {
    const foldersContext = testContext({ 'i/internal-regex': '^@org' })
    expect(importType('@org/foobar', foldersContext)).toEqual('internal')
  })

  it("should return 'external' for module from 'node_modules' if its name did not match 'internal-regex'", function () {
    const foldersContext = testContext({ 'i/internal-regex': '^@bar' })
    expect(importType('@org/foobar', foldersContext)).toEqual('external')
  })

  it("should return 'external' for module from 'node_modules' if 'node_modules' contained in 'external-module-folders'", function () {
    const foldersContext = testContext({
      'i/external-module-folders': ['node_modules'],
    })
    expect(importType('resolve', foldersContext)).toEqual('external')
  })

  it('returns "external" for a scoped symlinked module', function () {
    const foldersContext = testContext({
      'i/resolver': 'node',
      'i/external-module-folders': ['node_modules'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toEqual(
      'external',
    )
  })

  // We're using Webpack resolver here since it resolves all symlinks, which means that
  // directory path will not contain node_modules/<package-name> but will point to the
  // actual directory inside 'files' instead
  it('returns "external" for a scoped module from a symlinked directory which name is contained in "external-module-folders" (webpack resolver)', function () {
    const foldersContext = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['symlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toEqual(
      'external',
    )
  })

  it('returns "internal" for a scoped module from a symlinked directory which incomplete name is contained in "external-module-folders" (webpack resolver)', function () {
    const foldersContext_1 = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['symlinked-mod'],
    })
    expect(importType('@test-scope/some-module', foldersContext_1)).toEqual(
      'internal',
    )

    const foldersContext_2 = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['linked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext_2)).toEqual(
      'internal',
    )
  })

  it('returns "external" for a scoped module from a symlinked directory which partial path is contained in "external-module-folders" (webpack resolver)', function () {
    const originalFoldersContext = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': [],
    })
    expect(
      importType('@test-scope/some-module', originalFoldersContext),
    ).toEqual('internal')

    const foldersContext = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['symlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toEqual(
      'external',
    )
  })

  it('returns "internal" for a scoped module from a symlinked directory which partial path w/ incomplete segment is contained in "external-module-folders" (webpack resolver)', function () {
    const foldersContext_1 = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['files/symlinked-mod'],
    })
    expect(importType('@test-scope/some-module', foldersContext_1)).toEqual(
      'internal',
    )

    const foldersContext_2 = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['ymlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext_2)).toEqual(
      'internal',
    )
  })

  it('returns "external" for a scoped module from a symlinked directory which partial path ending w/ slash is contained in "external-module-folders" (webpack resolver)', function () {
    const foldersContext = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['symlinked-module/'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toEqual(
      'external',
    )
  })

  it('returns "internal" for a scoped module from a symlinked directory when "external-module-folders" contains an absolute path resembling directory‘s relative path (webpack resolver)', function () {
    const foldersContext = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': ['/symlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toEqual(
      'internal',
    )
  })

  it('returns "external" for a scoped module from a symlinked directory which absolute path is contained in "external-module-folders" (webpack resolver)', function () {
    const foldersContext = testContext({
      'i/resolver': 'webpack',
      'i/external-module-folders': [testFilePath('symlinked-module')],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toEqual(
      'external',
    )
  })

  it('`isExternalModule` works with windows directory separator', function () {
    const context = testContext()
    expect(
      isExternalModule('foo', 'E:\\path\\to\\node_modules\\foo', context),
    ).toBe(true)
    expect(
      isExternalModule(
        '@foo/bar',
        'E:\\path\\to\\node_modules\\@foo\\bar',
        context,
      ),
    ).toBe(true)
    expect(
      isExternalModule(
        'foo',
        'E:\\path\\to\\node_modules\\foo',
        testContext({
          settings: {
            'i/external-module-folders': ['E:\\path\\to\\node_modules'],
          },
        }),
      ),
    ).toBe(true)
  })

  it('`isExternalModule` works with unix directory separator', function () {
    const context = testContext()
    expect(isExternalModule('foo', '/path/to/node_modules/foo', context)).toBe(
      true,
    )
    expect(
      isExternalModule('@foo/bar', '/path/to/node_modules/@foo/bar', context),
    ).toBe(true)
    expect(
      isExternalModule(
        'foo',
        '/path/to/node_modules/foo',
        testContext({
          settings: {
            'i/external-module-folders': ['/path/to/node_modules'],
          },
        }),
      ),
    ).toBe(true)
  })

  it('correctly identifies scoped modules with `isScoped`', () => {
    expect(isScoped('@/abc')).toBe(false)
    expect(isScoped('@/abc/def')).toBe(false)
    expect(isScoped('@a/abc')).toBe(true)
    expect(isScoped('@a/abc/def')).toBe(true)
  })
})

describe('isAbsolute', () => {
  it('does not throw on a non-string', () => {
    expect(() => isAbsolute()).not.toThrow()
    expect(() => isAbsolute(null)).not.toThrow()
    expect(() => isAbsolute(true)).not.toThrow()
    expect(() => isAbsolute(false)).not.toThrow()
    expect(() => isAbsolute(0)).not.toThrow()
    expect(() => isAbsolute(NaN)).not.toThrow()
  })
})
