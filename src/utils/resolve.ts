import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { stableHash } from 'stable-hash'

import type {
  ChildContext,
  ImportSettings,
  LegacyResolver,
  NewResolver,
  PluginSettings,
  ResolveOptionsExtra,
  RuleContext,
} from '../types.js'

import { getTsconfigWithContext, makeContextCacheKey } from './export-map.js'
import { defineLazyProperty } from './lazy-value.js'
import {
  normalizeConfigResolvers,
  resolveWithLegacyResolver,
} from './legacy-resolver-settings.js'
import { ModuleCache } from './module-cache.js'

const importMetaUrl = import.meta.url

const _filename = importMetaUrl
  ? fileURLToPath(importMetaUrl)
  : /* istanbul ignore next */ __filename
const _dirname = path.dirname(_filename)

export const CASE_SENSITIVE_FS = !fs.existsSync(
  path.resolve(
    _dirname,
    path.basename(_filename).replace(/^resolve\./, 'reSOLVE.'),
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

function isNamedResolver(resolver: unknown): resolver is { name: string } {
  return !!(
    typeof resolver === 'object' &&
    resolver &&
    'name' in resolver &&
    typeof resolver.name === 'string' &&
    resolver.name
  )
}

function isValidNewResolver(resolver: unknown): resolver is NewResolver {
  if (typeof resolver !== 'object' || resolver == null) {
    return false
  }

  if (!('resolve' in resolver) || !('interfaceVersion' in resolver)) {
    return false
  }

  if (
    typeof resolver.interfaceVersion !== 'number' ||
    resolver.interfaceVersion !== 3
  ) {
    return false
  }

  if (typeof resolver.resolve !== 'function') {
    return false
  }

  return true
}

function fullResolve(
  modulePath: string,
  sourceFile: string,
  settings: PluginSettings,
  context: ChildContext | RuleContext,
  extra: ResolveOptionsExtra = defineLazyProperty({}, 'tsconfig', () =>
    getTsconfigWithContext(context),
  ),
) {
  // check if this is a bonus core module
  const coreSet = new Set(settings['import-x/core-modules'])
  if (coreSet.has(modulePath)) {
    return {
      found: true,
      path: null,
    }
  }

  const childContextHashKey = makeContextCacheKey(context)

  const sourceDir = path.dirname(sourceFile)

  if (prevSettings !== settings) {
    memoizedHash = stableHash(settings)
    prevSettings = settings
  }

  const cacheKey = [
    sourceDir,
    childContextHashKey,
    memoizedHash,
    modulePath,
  ].join(',')

  const cacheSettings = ModuleCache.getSettings(settings)

  const cachedPath = fileExistsCache.get<string | null>(cacheKey, cacheSettings)
  if (cachedPath !== undefined) {
    return { found: true, path: cachedPath }
  }

  if (
    Object.hasOwn(settings, 'import-x/resolver-next') &&
    settings['import-x/resolver-next']
  ) {
    let configResolvers = settings['import-x/resolver-next']

    if (!Array.isArray(configResolvers)) {
      configResolvers = [configResolvers]
    }

    for (let i = 0, len = configResolvers.length; i < len; i++) {
      const resolver = configResolvers[i]
      const resolverName = isNamedResolver(resolver)
        ? resolver.name
        : `settings['import-x/resolver-next'][${i}]`

      if (!isValidNewResolver(resolver)) {
        const err = new TypeError(
          `${resolverName} is not a valid import resolver for eslint-plugin-import-x!`,
        )
        err.name = IMPORT_RESOLVE_ERROR_NAME
        throw err
      }

      const resolved = resolver.resolve(
        modulePath,
        sourceFile,
        // we're not using `...extra` to keep `tsconfig` getter
        Object.assign(extra, { context }),
      )

      if (!resolved.found) {
        continue
      }

      // else, counts
      fileExistsCache.set(cacheKey, resolved.path)
      return resolved
    }
  } else {
    const configResolvers = settings['import-x/resolver-legacy'] ||
      settings['import-x/resolver'] || {
        node: settings['import-x/resolve'],
      } // backward compatibility

    for (const { enable, options, resolver } of normalizeConfigResolvers(
      configResolvers,
      sourceFile,
    )) {
      if (!enable) {
        continue
      }

      const resolved = resolveWithLegacyResolver(
        resolver,
        options,
        modulePath,
        sourceFile,
        context,
        extra,
      )
      if (!resolved.found) {
        continue
      }

      // else, counts
      fileExistsCache.set(cacheKey, resolved.path as string | null)
      return resolved
    }
  }

  // failed
  // cache(undefined)
  return { found: false }
}

export function relative(
  modulePath: string,
  sourceFile: string,
  settings: PluginSettings,
  context: ChildContext | RuleContext,
  extra?: ResolveOptionsExtra,
) {
  return fullResolve(modulePath, sourceFile, settings, context, extra).path
}

const erroredContexts = new Set<RuleContext>()

/**
 * Given
 *
 * @param modulePath - Module path
 * @param context - ESLint context
 * @returns - The full module filesystem path; null if package is core;
 *   undefined if not found
 */
export function resolve(
  modulePath: string,
  context: RuleContext,
  extra?: ResolveOptionsExtra,
) {
  try {
    return relative(
      modulePath,
      context.physicalFilename,
      context.settings,
      context,
      extra,
    )
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

export function importXResolverCompat(
  resolver: LegacyResolver | NewResolver,
  resolverOptions: unknown = {},
): NewResolver {
  // Somehow the resolver is already using v3 interface
  if (isValidNewResolver(resolver)) {
    return resolver
  }

  return {
    // deliberately not providing the name, because we can't get the name from legacy resolvers
    // By omitting the name, the log will use identifiable name like `settings['import-x/resolver-next'][0]`
    // name: 'import-x-resolver-compat',
    interfaceVersion: 3,
    resolve(modulePath, sourceFile, options) {
      const resolved = resolveWithLegacyResolver(
        resolver,
        resolverOptions,
        modulePath,
        sourceFile,
        options.context,
        defineLazyProperty({}, 'tsconfig', () => options.tsconfig),
      )
      return resolved
    },
  }
}
