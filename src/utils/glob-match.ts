import { isMatch, matcher, scan } from 'micromatch'
import type { Options } from 'micromatch'

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

const BACKSLASHES = /\\/g

const normalizeBackslashes = (str: string) => str.replaceAll(BACKSLASHES, '/')

export const isFileMatch = (filename: string, globs: string[]) =>
  isMatch(filename, globs) ||
  isMatch(normalizeBackslashes(filename), globs.map(normalizeBackslashes))

export const fileMatcher = (pattern: string, options?: Options) => {
  const isMatch1 = matcher(pattern, options)
  const isMatch2 = matcher(normalizeBackslashes(pattern), options)
  return (filepath: string) => {
    return isMatch1(filepath) || isMatch2(normalizeBackslashes(filepath))
  }
}
