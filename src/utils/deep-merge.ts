export type ObjectLike<T = unknown> = Record<string, T>

/**
 * Check if the variable contains an object strictly rejecting arrays
 *
 * @returns `true` if obj is an object
 */
export function isObjectNotArray(obj: unknown): obj is ObjectLike {
  return typeof obj === 'object' && obj != null && !Array.isArray(obj)
}

/**
 * Pure function - doesn't mutate either parameter! Merges two objects together
 * deeply, overwriting the properties in first with the properties in second
 *
 * @param first The first object
 * @param second The second object
 * @returns A new object
 */
export function deepMerge(
  first: ObjectLike = {},
  second: ObjectLike = {},
): Record<string, unknown> {
  // get the unique set of keys across both objects
  const keys = new Set([...Object.keys(first), ...Object.keys(second)])

  return Object.fromEntries(
    [...keys].map(key => {
      const firstHasKey = key in first
      const secondHasKey = key in second
      const firstValue = first[key]
      const secondValue = second[key]

      let value
      if (firstHasKey && secondHasKey) {
        value =
          // object type
          isObjectNotArray(firstValue) && isObjectNotArray(secondValue)
            ? deepMerge(firstValue, secondValue)
            : // value type
              secondValue
      } else if (firstHasKey) {
        value = firstValue
      } else {
        value = secondValue
      }
      return [key, value]
    }),
  )
}
