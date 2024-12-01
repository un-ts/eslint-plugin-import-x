import fs from 'node:fs'
import path from 'node:path'

import stableHash from 'stable-hash'

import type {
  ImportSettings,
  PluginSettings,
  RuleContext,
  Resolver,
  ResolvedResult,
} from '../types'

import { ModuleCache } from './module-cache'
import { normalizeConfigResolvers } from './legacy-resolver-settings'

export const CASE_SENSITIVE_FS = !fs.existsSync(
  path.resolve(
    __dirname,
    path.basename(__filename).replace(/^resolve\./, 'reSOLVE.'),
  ),
)

export const IMPORT_RESOLVE_ERROR_NAME = 'EslintPluginImportResolveError'

export const fileExistsCache = new ModuleCache()


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

  function withResolver(resolver: Resolver, config: unknown): ResolvedResult {
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

  const resolvers = normalizeConfigResolvers(configResolvers, sourceFile)

  for (const { enable, options, resolver } of resolvers) {
    if (!enable) {
      continue
    }

    const resolved = withResolver(resolver, options)

    if (!resolved.found) {
      continue
    }

    // else, counts
    fileExistsCache.set(cacheKey, resolved.path as string | null)
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
      if (error.name !== IMPORT_RESOLVE_ERROR_NAME && error.stack) {
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


