import { deepMerge, isObjectNotArray } from './deep-merge.js'

/**
 * Pure function - doesn't mutate either parameter! Uses the default options and
 * overrides with the options provided by the user
 *
 * @param defaultOptions The defaults
 * @param userOptions The user opts
 * @returns The options with defaults
 */
export function applyDefault<
  User extends readonly unknown[],
  Default extends User,
>(
  defaultOptions: Readonly<Default>,
  userOptions: Readonly<User> | null,
): Default {
  // clone defaults
  const options = structuredClone(defaultOptions) as AsMutable<Default>

  if (userOptions == null) {
    return options
  }

  // For avoiding the type error
  //   `This expression is not callable. Type 'unknown' has no call signatures.ts(2349)`
  for (const [i, opt] of (options as unknown[]).entries()) {
    if (userOptions[i] !== undefined) {
      const userOpt = userOptions[i]
      options[i] =
        isObjectNotArray(userOpt) && isObjectNotArray(opt)
          ? deepMerge(opt, userOpt)
          : userOpt
    }
  }

  return options
}

type AsMutable<T extends readonly unknown[]> = {
  -readonly [Key in keyof T]: T[Key]
}
