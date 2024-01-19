'use strict'

exports.__esModule = true

const fs = require('fs')
const { isBuiltin } = require('module')
const path = require('path')

const enhancedResolve = require('enhanced-resolve')

const { hashObject } = require('./hash')
const ModuleCache = require('./ModuleCache').default

const CASE_SENSITIVE_FS = !fs.existsSync(
  path.join(__dirname.toUpperCase(), 'reSOLVE.js'),
)

exports.CASE_SENSITIVE_FS = CASE_SENSITIVE_FS

const ERROR_NAME = 'EslintPluginImportResolveError'

const fileExistsCache = new ModuleCache()

// https://stackoverflow.com/a/27382838
exports.fileExistsWithCaseSync = function fileExistsWithCaseSync(
  filepath,
  cacheSettings,
  strict,
) {
  // don't care if the FS is case-sensitive
  if (CASE_SENSITIVE_FS) {
    return true
  }

  // null means it resolved to a builtin
  if (filepath === null) {
    return true
  }
  if (filepath.toLowerCase() === process.cwd().toLowerCase() && !strict) {
    return true
  }
  const parsedPath = path.parse(filepath)
  const { dir } = parsedPath

  let result = fileExistsCache.get(filepath, cacheSettings)
  if (result != null) {
    return result
  }

  // base case
  if (dir === '' || parsedPath.root === filepath) {
    result = true
  } else {
    const filenames = fs.readdirSync(dir)
    if (filenames.indexOf(parsedPath.base) === -1) {
      result = false
    } else {
      result = fileExistsWithCaseSync(dir, cacheSettings, strict)
    }
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
 * @type {import('enhanced-resolve').Resolver}
 */
let resolver

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

  if (!resolver) {
    resolver = enhancedResolve.ResolverFactory.createResolver({
      conditionNames: defaultConditionNames,
      extensions: defaultExtensions,
      extensionAlias: defaultExtensionAlias,
      mainFields: defaultMainFields,
      fileSystem: new enhancedResolve.CachedInputFileSystem(fs, 5 * 1000),
      useSyncFileSystemCalls: true,
    })
  }

  let foundNodePath

  try {
    foundNodePath = resolver.resolveSync({}, sourceDir, modulePath) || null
  } catch {
    foundNodePath = null
  }

  const resolved = {
    found: !!foundNodePath,
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
 * @param  {string} p - module path
 * @param  {object} context - ESLint context
 * @return {string} - the full module filesystem path;
 *                    null if package is core;
 *                    undefined if not found
 */
function resolve(p, context) {
  try {
    return relative(
      p,
      context.getPhysicalFilename
        ? context.getPhysicalFilename()
        : context.getFilename(),
      context.settings,
    )
  } catch (err) {
    if (!erroredContexts.has(context)) {
      // The `err.stack` string starts with `err.name` followed by colon and `err.message`.
      // We're filtering out the default `err.name` because it adds little value to the message.
      let errMessage = err.message
      if (err.name !== ERROR_NAME && err.stack) {
        errMessage = err.stack.replace(/^Error: /, '')
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
exports.default = resolve
