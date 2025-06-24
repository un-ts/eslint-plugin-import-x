import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { setRuleContext } from 'eslint-import-context'
import { stableHash } from 'stable-hash-x'

import { createNodeResolver } from '../node-resolver.js'
import { cjsRequire } from '../require.js'
import type {
  ChildContext,
  LegacyResolver,
  NewResolver,
  NodeResolverOptions,
  NormalizedCacheSettings,
  PluginSettings,
  RuleContext,
} from '../types.js'

import { arraify } from './arraify.js'
import { makeContextCacheKey } from './export-map.js'
import {
  LEGACY_NODE_RESOLVERS,
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
  cacheSettings: NormalizedCacheSettings,
  strict?: boolean,
  leaf: boolean = true,
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
      ? fileExistsWithCaseSync(dir, cacheSettings, strict, false)
      : !leaf
        // We tolerate case-insensitive matches if there are no case-insensitive matches.
        // It'll fail anyway on the leaf node if the file truly doesn't exist (if it doesn't
        // fail it's that we're probably working with a virtual in-memory filesystem).
        ? filenames.findIndex(p => p.toLowerCase() === parsedPath.base) === -1
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

function legacyNodeResolve(
  resolverOptions: NodeResolverOptions,
  context: ChildContext | RuleContext,
  modulePath: string,
  sourceFile: string,
) {
  const {
    extensions,
    includeCoreModules,
    moduleDirectory,
    paths,
    preserveSymlinks,
    package: packageJson,
    packageFilter,
    pathFilter,
    packageIterator,
    ...rest
  } = resolverOptions

  const normalizedExtensions = arraify(extensions)

  const modules = arraify(moduleDirectory)

  // TODO: change the default behavior to align node itself
  const symlinks = preserveSymlinks === false

  const resolver = createNodeResolver({
    extensions: normalizedExtensions,
    builtinModules: includeCoreModules !== false,
    modules,
    symlinks,
    ...rest,
  })

  const resolved = setRuleContext(context, () =>
    resolver.resolve(modulePath, sourceFile),
  )

  if (resolved.found) {
    return resolved
  }

  const normalizedPaths = arraify(paths)

  if (normalizedPaths?.length) {
    const paths = modules?.length
      ? normalizedPaths.filter(p => !modules.includes(p))
      : normalizedPaths

    if (paths.length > 0) {
      const resolver = createNodeResolver({
        extensions: normalizedExtensions,
        builtinModules: includeCoreModules !== false,
        modules: paths,
        symlinks,
        ...rest,
      })

      const resolved = setRuleContext(context, () =>
        resolver.resolve(modulePath, sourceFile),
      )

      if (resolved.found) {
        return resolved
      }
    }
  }

  if (
    [packageJson, packageFilter, pathFilter, packageIterator].some(
      it => it != null,
    )
  ) {
    let legacyNodeResolver: LegacyResolver
    try {
      legacyNodeResolver = cjsRequire<LegacyResolver>(
        'eslint-import-resolver-node',
      )
    } catch {
      throw new Error(
        [
          "You're using legacy resolver options which are not supported by the new resolver.",
          'Please either:',
          '1. Install `eslint-import-resolver-node` as a fallback, or',
          '2. Remove legacy options: `package`, `packageFilter`, `pathFilter`, `packageIterator`',
        ].join('\n'),
      )
    }
    const resolved = resolveWithLegacyResolver(
      legacyNodeResolver,
      resolverOptions,
      modulePath,
      sourceFile,
    )
    if (resolved.found) {
      return resolved
    }
  }
}

function fullResolve(
  modulePath: string,
  sourceFile: string,
  settings: PluginSettings,
  context: ChildContext | RuleContext,
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

  const cacheKey =
    sourceDir +
    '\0' +
    childContextHashKey +
    '\0' +
    memoizedHash +
    '\0' +
    modulePath

  const cacheSettings = ModuleCache.getSettings(settings)

  const cachedPath = fileExistsCache.get<string | null>(cacheKey, cacheSettings)
  if (cachedPath !== undefined) {
    return { found: true, path: cachedPath }
  }

  if (settings['import-x/resolver-next']) {
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

      const resolved = setRuleContext(context, () =>
        resolver.resolve(modulePath, sourceFile),
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

    const sourceFiles =
      context.physicalFilename === sourceFile
        ? [sourceFile]
        : [context.physicalFilename, sourceFile]

    for (const sourceFile of sourceFiles) {
      for (const {
        enable,
        name,
        options,
        resolver,
      } of normalizeConfigResolvers(configResolvers, sourceFile)) {
        if (!enable) {
          continue
        }

        // if the resolver is `eslint-import-resolver-node`, we use the new `node` resolver first
        // and try `eslint-import-resolver-node` as fallback instead
        if (LEGACY_NODE_RESOLVERS.has(name)) {
          const resolverOptions = (options || {}) as NodeResolverOptions
          const resolved = legacyNodeResolve(
            resolverOptions,
            // TODO: enable the following in the next major
            // {
            //   ...resolverOptions,
            //   extensions:
            //     resolverOptions.extensions || settings['import-x/extensions'],
            // },
            context,
            modulePath,
            sourceFile,
          )

          if (resolved?.found) {
            fileExistsCache.set(cacheKey, resolved.path)
            return resolved
          }

          if (!resolver) {
            continue
          }
        }

        const resolved = setRuleContext(context, () =>
          resolveWithLegacyResolver(resolver, options, modulePath, sourceFile),
        )

        if (!resolved?.found) {
          continue
        }

        // else, counts
        fileExistsCache.set(cacheKey, resolved.path as string | null)
        return resolved
      }
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
) {
  return fullResolve(modulePath, sourceFile, settings, context).path
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
export function resolve(modulePath: string, context: RuleContext) {
  try {
    return relative(
      modulePath,
      context.physicalFilename,
      context.settings,
      context,
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
    resolve(modulePath, sourceFile) {
      return resolveWithLegacyResolver(
        resolver,
        resolverOptions,
        modulePath,
        sourceFile,
      )
    },
  }
}
