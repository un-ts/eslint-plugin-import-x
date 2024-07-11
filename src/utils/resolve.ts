import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import stableHash from 'stable-hash'

import type {
  Arrayable,
  ImportResolver,
  ImportSettings,
  PluginSettings,
  RuleContext,
} from '../types'

import { ModuleCache } from './module-cache'
import { pkgDir } from './pkg-dir'

export type ResultNotFound = {
  found: false
  path?: undefined
}

export type ResultFound = {
  found: true
  path: string | null
}

export type ResolvedResult = ResultNotFound | ResultFound

export type ResolverResolve = (
  modulePath: string,
  sourceFile: string,
  config: unknown,
) => ResolvedResult

export type ResolverResolveImport = (
  modulePath: string,
  sourceFile: string,
  config: unknown,
) => string | undefined

export type Resolver = {
  interfaceVersion?: 1 | 2
  resolve: ResolverResolve
  resolveImport: ResolverResolveImport
}

export const CASE_SENSITIVE_FS = !fs.existsSync(
  path.resolve(
    __dirname,
    path.basename(__filename).replace(/^resolve\./, 'reSOLVE.'),
  ),
)

const ERROR_NAME = 'EslintPluginImportResolveError'

const fileExistsCache = new ModuleCache()

function tryRequire<T>(
  target: string,
  sourceFile?: string | null,
): undefined | T {
  let resolved
  try {
    // Check if the target exists
    if (sourceFile == null) {
      resolved = require.resolve(target)
    } else {
      try {
        resolved = createRequire(path.resolve(sourceFile)).resolve(target)
      } catch {
        resolved = require.resolve(target)
      }
    }
  } catch {
    // If the target does not exist then just return undefined
    return undefined
  }

  // If the target exists then return the loaded module
  return require(resolved)
}

// https://stackoverflow.com/a/27382838
export function fileExistsWithCaseSync(
  filepath: string | null,
  cacheSettings?: ImportSettings['cache'],
  strict?: boolean,
): boolean {
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
  const dir = parsedPath.dir

  let result = fileExistsCache.get<boolean>(filepath, cacheSettings)
  if (result != null) {
    return result
  }

  // base case
  if (dir === '' || parsedPath.root === filepath) {
    result = true
  } else {
    const filenames = fs.readdirSync(dir)
    result = filenames.includes(parsedPath.base)
      ? fileExistsWithCaseSync(dir, cacheSettings, strict)
      : false
  }
  fileExistsCache.set(filepath, result)
  return result
}

let prevSettings: PluginSettings | null = null
let memoizedHash: string

function fullResolve(
  modulePath: string,
  sourceFile: string,
  settings: PluginSettings,
) {
  // check if this is a bonus core module
  const coreSet = new Set(settings['import-x/core-modules'])
  if (coreSet.has(modulePath)) {
    return {
      found: true,
      path: null,
    }
  }

  const sourceDir = path.dirname(sourceFile)

  if (prevSettings !== settings) {
    memoizedHash = stableHash(settings)
    prevSettings = settings
  }

  const cacheKey = sourceDir + memoizedHash + modulePath

  const cacheSettings = ModuleCache.getSettings(settings)

  const cachedPath = fileExistsCache.get<string | null>(cacheKey, cacheSettings)
  if (cachedPath !== undefined) {
    return { found: true, path: cachedPath }
  }

  function cache(resolvedPath: string | null) {
    fileExistsCache.set(cacheKey, resolvedPath)
  }

  function withResolver(resolver: Resolver, config: unknown) {
    if (resolver.interfaceVersion === 2) {
      return resolver.resolve(modulePath, sourceFile, config)
    }

    try {
      const resolved = resolver.resolveImport(modulePath, sourceFile, config)
      if (resolved === undefined) {
        return {
          found: false,
        }
      }
      return {
        found: true,
        path: resolved,
      }
    } catch {
      return {
        found: false,
      }
    }
  }

  const configResolvers = settings['import-x/resolver'] || {
    node: settings['import-x/resolve'],
  } // backward compatibility

  const resolvers = resolverReducer(configResolvers, new Map())

  for (const [name, config] of resolvers) {
    const resolver = requireResolver(name, sourceFile)
    const resolved = withResolver(resolver, config)

    if (!resolved.found) {
      continue
    }

    // else, counts
    cache(resolved.path as string | null)
    return resolved
  }

  // failed
  // cache(undefined)
  return { found: false }
}

export function relative(
  modulePath: string,
  sourceFile: string,
  settings: PluginSettings,
) {
  return fullResolve(modulePath, sourceFile, settings).path
}

function resolverReducer(
  resolvers: Arrayable<ImportResolver>,
  map: Map<string, unknown>,
) {
  if (Array.isArray(resolvers)) {
    for (const r of resolvers as ImportResolver[]) resolverReducer(r, map)
    return map
  }

  if (typeof resolvers === 'string') {
    map.set(resolvers, null)
    return map
  }

  if (typeof resolvers === 'object') {
    for (const [key, value] of Object.entries(resolvers)) {
      map.set(key, value)
    }
    return map
  }

  const err = new Error('invalid resolver config')
  err.name = ERROR_NAME
  throw err
}

function getBaseDir(sourceFile: string): string {
  return pkgDir(sourceFile) || process.cwd()
}

function requireResolver(name: string, sourceFile: string) {
  // Try to resolve package with conventional name
  const resolver =
    tryRequire(`eslint-import-resolver-${name}`, sourceFile) ||
    tryRequire(name, sourceFile) ||
    tryRequire(path.resolve(getBaseDir(sourceFile), name))

  if (!resolver) {
    const err = new Error(`unable to load resolver "${name}".`)
    err.name = ERROR_NAME
    throw err
  }
  if (!isResolverValid(resolver)) {
    const err = new Error(`${name} with invalid interface loaded as resolver`)
    err.name = ERROR_NAME
    throw err
  }

  return resolver
}

function isResolverValid(resolver: object): resolver is Resolver {
  if ('interfaceVersion' in resolver && resolver.interfaceVersion === 2) {
    return (
      'resolve' in resolver &&
      !!resolver.resolve &&
      typeof resolver.resolve === 'function'
    )
  }
  return (
    'resolveImport' in resolver &&
    !!resolver.resolveImport &&
    typeof resolver.resolveImport === 'function'
  )
}

const erroredContexts = new Set<RuleContext>()

/**
 * Given
 * @param p - module path
 * @param context - ESLint context
 * @return - the full module filesystem path; null if package is core; undefined if not found
 */
export function resolve(p: string, context: RuleContext) {
  try {
    return relative(p, context.physicalFilename, context.settings)
  } catch (error_) {
    const error = error_ as Error
    if (!erroredContexts.has(context)) {
      // The `err.stack` string starts with `err.name` followed by colon and `err.message`.
      // We're filtering out the default `err.name` because it adds little value to the message.
      let errMessage = error.message
      if (error.name !== ERROR_NAME && error.stack) {
        errMessage = error.stack.replace(/^Error: /, '')
      }
      context.report({
        // @ts-expect-error - report without messageId
        message: `Resolve error: ${errMessage}`,
        loc: {
          line: 1,
          column: 0,
        },
      })
      erroredContexts.add(context)
    }
  }
}
