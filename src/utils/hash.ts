/**
 * Utilities for hashing config objects. basically iteratively updates hash with
 * a JSON-like format
 */

import type { Hash } from 'node:crypto'
import { createHash } from 'node:crypto'

export function hashify(value?: unknown, hash?: Hash) {
  hash ??= createHash('sha256')

  if (Array.isArray(value)) {
    hashArray(value, hash)
  } else if (value instanceof Object) {
    hashObject(value, hash)
  } else {
    hash.update(JSON.stringify(value) || 'undefined')
  }

  return hash
}

export function hashArray(array: unknown[], hash?: Hash) {
  hash ??= createHash('sha256')

  hash.update('[')

  for (const element of array) {
    hashify(element, hash)
    hash.update(',')
  }

  hash.update(']')

  return hash
}

export function hashObject<T extends object = object>(object: T, hash?: Hash) {
  hash ??= createHash('sha256')

  hash.update('{')

  for (const key of Object.keys(object).sort()) {
    hash.update(JSON.stringify(key))
    hash.update(':')
    hashify(object[key as keyof T], hash)
    hash.update(',')
  }

  hash.update('}')

  return hash
}
