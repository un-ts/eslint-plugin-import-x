/**
 * utilities for hashing config objects.
 * basically iteratively updates hash with a JSON-like format
 */

'use strict'

exports.__esModule = true

const { createHash } = require('crypto')

const { stringify } = JSON

function hashify(value, hash) {
  if (!hash) {
    hash = createHash('sha256')
  }

  if (Array.isArray(value)) {
    hashArray(value, hash)
  } else if (value instanceof Object) {
    hashObject(value, hash)
  } else {
    hash.update(stringify(value) || 'undefined')
  }

  return hash
}
exports.default = hashify

function hashArray(array, hash) {
  if (!hash) {
    hash = createHash('sha256')
  }

  hash.update('[')
  for (const element of array) {
    hashify(element, hash)
    hash.update(',')
  }
  hash.update(']')

  return hash
}
hashify.array = hashArray
exports.hashArray = hashArray

/**
 *
 * @param {object} object
 * @param {import('crypto').Hash} [hash]
 * @returns
 */
function hashObject(object, hash) {
  if (!hash) {
    hash = createHash('sha256')
  }

  hash.update('{')
  for (const key of Object.keys(object).sort()) {
    hash.update(stringify(key))
    hash.update(':')
    hashify(object[key], hash)
    hash.update(',')
  }
  hash.update('}')

  return hash
}
hashify.object = hashObject
exports.hashObject = hashObject
