/**
 * When a value is expensive to generate, w/ this utility you can delay the computation until the value is needed. And once the value is computed, it will be cached for future calls.
 */
export const lazy = <T>(cb: () => T): LazyValue<T> => {
  let isCalled = false
  let result: T | undefined

  return (() => {
    if (!isCalled) {
      isCalled = true
      result = cb()
    }

    return result
  }) as LazyValue<T>
}

export type LazyValue<T> = () => Readonly<T>

export function defineLazyProperty<
  ObjectType,
  PropertyNameType extends string,
  PropertyValueType,
>(
  object: ObjectType,
  propertyName: PropertyNameType,
  valueGetter: () => PropertyValueType,
) {
  const define = (value: PropertyValueType) =>
    Object.defineProperty(object, propertyName, {
      value,
      enumerable: true,
      writable: true,
    })

  Object.defineProperty(object, propertyName, {
    configurable: true,
    enumerable: true,
    get() {
      const result = valueGetter()
      define(result)
      return result
    },
    set(value) {
      define(value)
    },
  })

  return object
}
