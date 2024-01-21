'use strict'

const fs = require('fs')
const { isBuiltin } = require('module')
const path = require('path')

const enhancedResolve = require('enhanced-resolve')

const ModuleCache = require('./ModuleCache')
const { hashObject } = require('./hash')

module.exports = resolve

const CASE_SENSITIVE_FS = !fs.existsSync(
  path.join(__dirname.toUpperCase(), 'reSOLVE.js'),
)

resolve.CASE_SENSITIVE_FS = CASE_SENSITIVE_FS

const fileExistsCache = new ModuleCache()

// https://stackoverflow.com/a/27382838
resolve.fileExistsWithCaseSync = function fileExistsWithCaseSync(
  filepath,
  cacheSettings,
  strict,
) {
  // don't care if the FS is case-sensitive
  if (CASE_SENSITIVE_FS) {
    return true
  }

  // null means it resolved to a builtin
  if (filepath == null) {
    return true
  }
  if (filepath.toLowerCase() === process.cwd().toLowerCase() && !strict) {
    return true
  }
  const parsedPath = path.parse(filepath)
  const { dir, root, base } = parsedPath

  let result = fileExistsCache.get(filepath, cacheSettings)
  if (result != null) {
    return result
  }

  // base case
  if (dir === '' || root === filepath) {
    result = true
  } else {
    const filenames = fs.readdirSync(dir)
    result = filenames.includes(base)
      ? fileExistsWithCaseSync(dir, cacheSettings, strict)
      : false
  }
  fileExistsCache.set(filepath, result)
  return result
}

function relative(modulePath, sourceFile, settings) {
  return fullResolve(modulePath, sourceFile, settings).path
}

const defaultConditionNames = [
  'types',
  'import',

  // APF: https://angular.io/guide/angular-package-format
  'esm2022',
  'fesm2022',
  'esm2020',
  'es2020',
  'fesm2020',
  'es2015',
  'fesm2015',

  'require',
  'node',
  'node-addons',
  'browser',
  'default',
]

/**
 * `.mts`, `.cts`, `.d.mts`, `.d.cts`, `.mjs`, `.cjs` are not included because `.cjs` and `.mjs` must be used explicitly
 */
const defaultExtensions = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.json',
  '.node',
]

const defaultExtensionAlias = {
  '.js': [
    '.ts',
    // `.tsx` can also be compiled as `.js`
    '.tsx',
    '.d.ts',
    '.js',
  ],
  '.jsx': ['.tsx', '.d.ts', '.jsx'],
  '.cjs': ['.cts', '.d.cts', '.cjs'],
  '.mjs': ['.mts', '.d.mts', '.mjs'],
}

const defaultMainFields = [
  'types',
  'typings',

  // APF: https://angular.io/guide/angular-package-format
  'esm2022',
  'fesm2022',
  'esm2020',
  'es2020',
  'fesm2020',
  'es2015',
  'fesm2015',

  'module',
  'jsnext:main',

  'main',
]

let prevSettings = null
let memoizedHash = ''

/**
 * @type {string}
 */
let prevResolverOptionsHash
/**
 * @type {string}
 */
let resolverOptionsHash

/**
 * @type {import('enhanced-resolve').Resolver}
 */
let cachedResolverOptions
/**
 * @type {import('enhanced-resolve').Resolver}
 */
let resolverCachedOptions

/**
 * @type {import('enhanced-resolve').Resolver}
 */
let resolver

const { toString } = Object.prototype

const isPlainObject = value => toString.call(value) === '[object Object]'

function fullResolve(modulePath, sourceFile, settings) {
  if (isBuiltin(modulePath)) {
    return { found: true, path: null }
  }

  // check if this is a bonus core module
  const coreSet = new Set(settings['i/core-modules'])
  if (coreSet.has(modulePath)) {
    return { found: true, path: null }
  }

  const sourceDir = path.dirname(sourceFile)

  if (prevSettings !== settings) {
    memoizedHash = hashObject(settings).digest('hex')
    prevSettings = settings
  }

  const cacheKey = sourceDir + memoizedHash + modulePath

  const cacheSettings = ModuleCache.getSettings(settings)

  const cachedPath = fileExistsCache.get(cacheKey, cacheSettings)

  if (cachedPath !== undefined) {
    return { found: true, path: cachedPath }
  }

  function cache(resolvedPath) {
    fileExistsCache.set(cacheKey, resolvedPath)
  }

  /**
   * @type {Omit<enhancedResolve.ResolveOptions, 'fileSystem' | 'useSyncFileSystemCalls'>}
   */
  let resolverOptions = settings['i/resolver']

  if (resolverOptions == null) {
    resolverOptions = {}
  }

  if (!isPlainObject(resolverOptions)) {
    throw new TypeError(
      `Expected \`resolver\` setting to be an options object, got \`${typeof resolverOptions}\``,
    )
  }

  if (
    !cachedResolverOptions ||
    prevResolverOptionsHash !==
      (resolverOptionsHash = hashObject(resolverOptions).digest('hex'))
  ) {
    prevResolverOptionsHash = resolverOptionsHash
    cachedResolverOptions = {
      ...resolverOptions,
      conditionNames: resolverOptions.conditionNames || defaultConditionNames,
      extensions: resolverOptions.extensions || defaultExtensions,
      extensionAlias: resolverOptions.extensionAlias || defaultExtensionAlias,
      mainFields: resolverOptions.mainFields || defaultMainFields,
      fileSystem: new enhancedResolve.CachedInputFileSystem(fs, 5 * 1000),
      useSyncFileSystemCalls: true,
    }
  }

  if (!resolver || resolverCachedOptions !== cachedResolverOptions) {
    resolver = enhancedResolve.ResolverFactory.createResolver(
      cachedResolverOptions,
    )
    resolverCachedOptions = cachedResolverOptions
  }

  /**
   * @type {string | false}
   */
  let foundNodePath

  try {
    foundNodePath = resolver.resolveSync({}, sourceDir, modulePath)
  } catch {
    // do nothing
  }

  /**
   * @type {false | {found: true, path: string}}
   */
  const resolved = foundNodePath !== false && {
    found: true,
    path: foundNodePath,
  }

  if (resolved) {
    cache(resolved.path)
    return resolved
  }

  // failed
  // cache(undefined)
  return { found: false }
}

exports.relative = relative

const erroredContexts = new Set()

/**
 * Given
 * @param  {string} modulePath - module path
 * @param  {object} context - ESLint context
 * @return {string} - the full module filesystem path;
 *                    null if package is core;
 *                    undefined if not found
 */
function resolve(modulePath, context) {
  try {
    return relative(
      modulePath,
      context.getPhysicalFilename
        ? context.getPhysicalFilename()
        : context.getFilename(),
      context.settings,
    )
  } catch (error) {
    console.error(error)
    if (!erroredContexts.has(context)) {
      // The `err.stack` string starts with `err.name` followed by colon and `err.message`.
      let errMessage = error.message
      if (error.stack) {
        errMessage = error.stack.replace(/^(\w+)Error: /, '')
      }
      context.report({
        message: `Resolve error: ${errMessage}`,
        loc: { line: 1, column: 0 },
      })
      erroredContexts.add(context)
    }
  }
}

resolve.relative = relative
