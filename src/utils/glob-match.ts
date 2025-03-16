import path from 'node:path'

import { isMatch as isMatch_, scan } from 'picomatch'
import type { PicomatchOptions } from 'picomatch'

/**
 * directly copied from {@link https://github.com/SuperchupuDev/tinyglobby/blob/020ae4a14ea93e1e906fca0ff1afae291591c3a0/src/utils.ts#L124C1-L143C2}
 *
 * Has a few minor differences with `fast-glob` for better accuracy:
 * Doesn't necessarily return false on patterns that include `\\`.
 *
 * Returns true if the pattern includes parentheses,
 * regardless of them representing one single pattern or not.
 * Returns true for unfinished glob extensions i.e. `(h`, `+(h`.
 * Returns true for unfinished brace expansions as long as they include `,` or `..`.
 */
export function isDynamicPattern(
  pattern: string,
  options?: { caseSensitiveMatch: boolean },
): boolean {
  if (options?.caseSensitiveMatch === false) {
    return true
  }

  const state = scan(pattern)
  return state.isGlob || state.negated
}

const normalizeBackslashes = (str: string) => str.replaceAll('\\', '/')

const defaultFormat = (path: string) => path.replace(/^\.\//, '')

const isMatchBase = (
  path: string,
  pattern: string,
  options?: PicomatchOptions,
) => {
  path = normalizeBackslashes(path)
  pattern = normalizeBackslashes(pattern)
  if (path.startsWith('./') && !/^(\.\/|\*{1,2})/.test(pattern)) {
    return false
  }
  return isMatch_(path, pattern, { format: defaultFormat, ...options })
}

export const isMatch = (
  pathname: string,
  patterns: string | string[],
  options?: PicomatchOptions,
) => {
  patterns = Array.isArray(patterns) ? patterns : [patterns]
  return patterns.some(p => isMatchBase(pathname, p, options))
}

export const matcher =
  (patterns?: string | string[], options?: PicomatchOptions) =>
  (pathname: string) =>
    !!patterns && isMatch(pathname, patterns, options)

export const isFileMatch = (
  pathname: string,
  patterns: string | string[],
  options?: PicomatchOptions,
) =>
  isMatch(pathname, patterns, options) ||
  isMatch(
    pathname,
    (Array.isArray(patterns) ? patterns : [patterns]).map(g => path.resolve(g)),
    options,
  )

export const fileMatcher =
  (patterns: string | string[], options?: PicomatchOptions) =>
  (pathname: string) =>
    isFileMatch(pathname, patterns, options)
