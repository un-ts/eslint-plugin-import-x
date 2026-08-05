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

export function makeContextCacheKey(context: RuleContext | ChildContext) {
  const { settings, parserPath, parserOptions, languageOptions, cwd } = context

  let hash =
    cwd +
    '\0' +
    stableHash(settings) +
    '\0' +
    stableHash(languageOptions?.parserOptions ?? parserOptions)

  if (languageOptions) {
    hash +=
      '\0' +
      String(languageOptions.ecmaVersion) +
      '\0' +
      String(languageOptions.sourceType)
  }

  hash +=
    '\0' +
    stableHash(
      parserPath ?? languageOptions?.parser?.meta ?? languageOptions?.parser,
    )

  return hash
}
