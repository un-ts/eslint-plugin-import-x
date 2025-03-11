import { isBuiltin } from 'node:module'

import { FIXTURES_PATH, testContext, testFilePath } from '../utils'

import {
  importType,
  isExternalModule,
  isScoped,
  isAbsolute,
} from 'eslint-plugin-import-x/utils'

describe('importType(name)', () => {
  const context = testContext()

  it("should return 'absolute' for paths starting with a /", () => {
    expect(importType('/', context)).toBe('absolute')
    expect(importType('/path', context)).toBe('absolute')
    expect(importType('/some/path', context)).toBe('absolute')
  })

  it("should return 'builtin' for node.js modules", () => {
    for (const x of ['fs', 'fs/promises', 'path'].filter(x => isBuiltin(x))) {
      expect(importType(x, context)).toBe('builtin')
      if (isBuiltin(`node:${x}`)) {
        expect(importType(`node:${x}`, context)).toBe('builtin')
      }
    }
  })

  it("should return 'external' for non-builtin modules without a relative path", () => {
    expect(importType('lodash', context)).toBe('external')
    expect(importType('async', context)).toBe('external')
    expect(importType('chalk', context)).toBe('external')
    expect(importType('foo', context)).toBe('external')
    expect(importType('lodash.find', context)).toBe('external')
    expect(importType('lodash/fp', context)).toBe('external')
  })

  it("should return 'external' for scopes packages", () => {
    expect(importType('@cycle/', context)).toBe('external')
    expect(importType('@cycle/core', context)).toBe('external')
    expect(importType('@cycle/dom', context)).toBe('external')
    expect(importType('@some-thing/something', context)).toBe('external')
    expect(importType('@some-thing/something/some-module', context)).toBe(
      'external',
    )
    expect(
      importType('@some-thing/something/some-directory/someModule.js', context),
    ).toBe('external')
  })

  it("should return 'external' for external modules that redirect to its parent module using package.json", () => {
    expect(
      importType('eslint-import-test-order-redirect/module', context),
    ).toBe('external')
    expect(
      importType('@eslint/import-test-order-redirect-scoped/module', context),
    ).toBe('external')
  })

  it("should return 'internal' for non-builtins resolved outside of node_modules", () => {
    const pathContext = testContext({
      'import-x/resolver': { node: { paths: [FIXTURES_PATH] } },
    })
    expect(importType('importType', pathContext)).toBe('internal')
  })

  it("should return 'internal' for scoped packages resolved outside of node_modules", () => {
    const pathContext = testContext({
      'import-x/resolver': { node: { paths: [FIXTURES_PATH] } },
    })
    expect(importType('@importType/index', pathContext)).toBe('internal')
  })

  it("should return 'internal' for internal modules that are referenced by aliases", () => {
    const pathContext = testContext({
      'import-x/resolver': { node: { paths: [FIXTURES_PATH] } },
    })
    expect(importType('@my-alias/fn', pathContext)).toBe('internal')
    expect(importType('@importType', pathContext)).toBe('internal')
  })

  it("should return 'internal' for aliased internal modules that look like core modules (node resolver)", () => {
    const pathContext = testContext({
      'import-x/resolver': { node: { paths: [FIXTURES_PATH] } },
    })
    expect(importType('constants/index', pathContext)).toBe('internal')
    expect(importType('constants/', pathContext)).toBe('internal')
    // resolves exact core modules over internal modules
    expect(importType('constants', pathContext)).toBe('builtin')
  })

  it("should return 'internal' for aliased internal modules that look like core modules (webpack resolver)", () => {
    const webpackConfig = {
      resolve: { modules: [FIXTURES_PATH, 'node_modules'] },
    }
    const pathContext = testContext({
      'import-x/resolver': { webpack: { config: webpackConfig } },
    })
    expect(importType('constants/index', pathContext)).toBe('internal')
    expect(importType('constants/', pathContext)).toBe('internal')
    expect(importType('constants', pathContext)).toBe('internal')
  })

  it("should return 'internal' for aliased internal modules that are found, even if they are not discernible as scoped", () => {
    // `@` for internal modules is a common alias and is different from scoped names.
    // Scoped names are prepended with `@` (e.g. `@scoped/some-file.js`) whereas `@`
    // as an alias by itelf is the full root name (e.g. `@/some-file.js`).
    const alias = { '@': [testFilePath('internal-modules')] }
    const webpackConfig = { resolve: { alias } }
    const pathContext = testContext({
      'import-x/resolver': { webpack: { config: webpackConfig } },
    })
    expect(importType('@/api/service', pathContext)).toBe('internal')
    expect(importType('@/does-not-exist', pathContext)).toBe('unknown')
  })

  it("should return 'parent' for internal modules that go through the parent", () => {
    expect(importType('../foo', context)).toBe('parent')
    expect(importType('../../foo', context)).toBe('parent')
    expect(importType('../bar/foo', context)).toBe('parent')
  })

  it("should return 'sibling' for internal modules that are connected to one of the siblings", () => {
    expect(importType('./foo', context)).toBe('sibling')
    expect(importType('./foo/bar', context)).toBe('sibling')
    expect(importType('./importType', context)).toBe('sibling')
    expect(importType('./importType/', context)).toBe('sibling')
    expect(importType('./importType/index', context)).toBe('sibling')
    expect(importType('./importType/index.js', context)).toBe('sibling')
  })

  it("should return 'index' for sibling index file", () => {
    expect(importType('.', context)).toBe('index')
    expect(importType('./', context)).toBe('index')
    expect(importType('./index', context)).toBe('index')
    expect(importType('./index.js', context)).toBe('index')
  })

  it("should return 'unknown' for any unhandled cases", () => {
    expect(importType('  /malformed', context)).toBe('unknown')
    expect(importType('   foo', context)).toBe('unknown')
    expect(importType('-/no-such-path', context)).toBe('unknown')
  })

  it("should return 'builtin' for additional core modules", () => {
    // without extra config, should be marked external
    expect(importType('electron', context)).toBe('external')
    expect(importType('@org/foobar', context)).toBe('external')

    const electronContext = testContext({
      'import-x/core-modules': ['electron'],
    })
    expect(importType('electron', electronContext)).toBe('builtin')

    const scopedContext = testContext({
      'import-x/core-modules': ['@org/foobar'],
    })
    expect(importType('@org/foobar', scopedContext)).toBe('builtin')
  })

  it("should return 'builtin' for resources inside additional core modules", () => {
    const electronContext = testContext({
      'import-x/core-modules': ['electron'],
    })
    expect(
      importType('electron/some/path/to/resource.json', electronContext),
    ).toBe('builtin')

    const scopedContext = testContext({
      'import-x/core-modules': ['@org/foobar'],
    })
    expect(
      importType('@org/foobar/some/path/to/resource.json', scopedContext),
    ).toBe('builtin')
  })

  it("should return 'external' for module from 'node_modules' with default config", () => {
    expect(importType('resolve', context)).toBe('external')
  })

  it("should return 'internal' for module from 'node_modules' if 'node_modules' missed in 'external-module-folders'", () => {
    const foldersContext = testContext({
      'import-x/external-module-folders': [],
    })
    expect(importType('jest', foldersContext)).toBe('internal')
  })

  it("should return 'internal' for module from 'node_modules' if its name matched 'internal-regex'", () => {
    const foldersContext = testContext({ 'import-x/internal-regex': '^@org' })
    expect(importType('@org/foobar', foldersContext)).toBe('internal')
  })

  it("should return 'external' for module from 'node_modules' if its name did not match 'internal-regex'", () => {
    const foldersContext = testContext({ 'import-x/internal-regex': '^@bar' })
    expect(importType('@org/foobar', foldersContext)).toBe('external')
  })

  it("should return 'external' for module from 'node_modules' if 'node_modules' contained in 'external-module-folders'", () => {
    const foldersContext = testContext({
      'import-x/external-module-folders': ['node_modules'],
    })
    expect(importType('resolve', foldersContext)).toBe('external')
  })

  it('returns "external" for a scoped symlinked module', () => {
    const foldersContext = testContext({
      'import-x/resolver': 'node',
      'import-x/external-module-folders': ['node_modules'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toBe(
      'external',
    )
  })

  // We're using Webpack resolver here since it resolves all symlinks, which means that
  // directory path will not contain node_modules/<package-name> but will point to the
  // actual directory inside 'fixtures' instead
  it('returns "external" for a scoped module from a symlinked directory which name is contained in "external-module-folders" (webpack resolver)', () => {
    const foldersContext = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['symlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toBe(
      'external',
    )
  })

  it('returns "internal" for a scoped module from a symlinked directory which incomplete name is contained in "external-module-folders" (webpack resolver)', () => {
    const foldersContext_1 = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['symlinked-mod'],
    })
    expect(importType('@test-scope/some-module', foldersContext_1)).toBe(
      'internal',
    )

    const foldersContext_2 = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['linked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext_2)).toBe(
      'internal',
    )
  })

  it('returns "external" for a scoped module from a symlinked directory which partial path is contained in "external-module-folders" (webpack resolver)', () => {
    const originalFoldersContext = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': [],
    })
    expect(importType('@test-scope/some-module', originalFoldersContext)).toBe(
      'internal',
    )

    const foldersContext = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['symlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toBe(
      'external',
    )
  })

  it('returns "internal" for a scoped module from a symlinked directory which partial path w/ incomplete segment is contained in "external-module-folders" (webpack resolver)', () => {
    const foldersContext_1 = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['fixtures/symlinked-mod'],
    })
    expect(importType('@test-scope/some-module', foldersContext_1)).toBe(
      'internal',
    )

    const foldersContext_2 = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['ymlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext_2)).toBe(
      'internal',
    )
  })

  it('returns "external" for a scoped module from a symlinked directory which partial path ending w/ slash is contained in "external-module-folders" (webpack resolver)', () => {
    const foldersContext = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['symlinked-module/'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toBe(
      'external',
    )
  })

  it('returns "internal" for a scoped module from a symlinked directory when "external-module-folders" contains an absolute path resembling directory‘s relative path (webpack resolver)', () => {
    const foldersContext = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': ['/symlinked-module'],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toBe(
      'internal',
    )
  })

  it('returns "external" for a scoped module from a symlinked directory which absolute path is contained in "external-module-folders" (webpack resolver)', () => {
    const foldersContext = testContext({
      'import-x/resolver': 'webpack',
      'import-x/external-module-folders': [testFilePath('symlinked-module')],
    })
    expect(importType('@test-scope/some-module', foldersContext)).toBe(
      'external',
    )
  })

  it('`isExternalModule` works with windows directory separator', () => {
    const context = testContext()
    expect(
      isExternalModule('foo', String.raw`E:\path\to\node_modules\foo`, context),
    ).toBe(true)
    expect(
      isExternalModule(
        '@foo/bar',
        String.raw`E:\path\to\node_modules\@foo\bar`,
        context,
      ),
    ).toBe(true)
    expect(
      isExternalModule(
        'foo',
        String.raw`E:\path\to\node_modules\foo`,
        testContext({
          'import-x/external-module-folders': [
            String.raw`E:\path\to\node_modules`,
          ],
        }),
      ),
    ).toBe(true)
  })

  it('`isExternalModule` works with unix directory separator', () => {
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
          'import-x/external-module-folders': ['/path/to/node_modules'],
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
    expect(() => isAbsolute(Number.NaN)).not.toThrow()
  })
})
