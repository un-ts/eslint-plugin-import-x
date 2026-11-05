import { stableHash } from 'stable-hash-x'

import type { ChildContext, RuleContext } from '../types.js'

/**
 * Don't hold full context object in memory, just grab what we need. also
 * calculate a cacheKey, where parts of the cacheKey hash are memoized
 */
export function childContext(
  path: string,
  context: RuleContext | ChildContext,
): ChildContext {
  const {
    settings,
    parserOptions,
    parserPath,
    languageOptions,
    cwd,
    filename,
    physicalFilename,
  } = context

  return {
    cacheKey: makeContextCacheKey(context) + '\0' + path,
    settings,
    parserOptions,
    parserPath,
    languageOptions,
    path,
    cwd,
    filename,
    physicalFilename,
  }
}

const hashIds = new Map<string, number>()

/**
 * `stableHash` returns the full text of what it hashes, and `settings` is shared
 * with other plugins, so one large value there would end up in every cache key.
 * Keep one copy of each hash here and put a short id in the keys.
 */
export function hashId(value: unknown) {
  const hash = stableHash(value)
  let id = hashIds.get(hash)
  if (id === undefined) {
    id = hashIds.size
    hashIds.set(hash, id)
  }
  return id
}

export function makeContextCacheKey(context: RuleContext | ChildContext) {
  const { settings, parserPath, parserOptions, languageOptions, cwd } = context

  let hash =
    cwd +
    '\0' +
    hashId(settings) +
    '\0' +
    hashId(languageOptions?.parserOptions ?? parserOptions)

  if (languageOptions) {
    hash +=
      '\0' +
      String(languageOptions.ecmaVersion) +
      '\0' +
      String(languageOptions.sourceType)
  }

  hash +=
    '\0' +
    hashId(
      parserPath ?? languageOptions?.parser?.meta ?? languageOptions?.parser,
    )

  return hash
}
