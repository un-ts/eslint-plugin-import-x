import { type Hash, createHash } from 'crypto'

import { hashify, hashArray, hashObject } from '../../src/utils/hash'

function expectHash(actualHash: Hash, expectedString: string) {
  const expectedHash = createHash('sha256')
  expectedHash.update(expectedString)
  // to be a hex digest of sha256 hash of string <${expectedString}>
  expect(actualHash.digest('hex')).toBe(expectedHash.digest('hex'))
}

describe('hash', () => {
  describe('hashify', () => {
    it('handles null', () => {
      expectHash(hashify(null), 'null')
    })

    it('handles undefined', () => {
      expectHash(hashify(undefined), 'undefined')
    })

    it('handles numbers', () => {
      expectHash(hashify(123.456), '123.456')
    })

    it('handles strings', () => {
      expectHash(hashify('a string'), '"a string"')
    })

    it('handles Array instances', () => {
      expectHash(hashify(['a string']), '["a string",]')
    })

    it('handles empty Array instances', () => {
      expectHash(hashify([]), '[]')
    })

    it('handles Object instances', () => {
      expectHash(
        hashify({ foo: 123.456, 'a key': 'a value' }),
        '{"a key":"a value","foo":123.456,}',
      )
    })

    it('handles nested Object instances', () => {
      expectHash(
        hashify({
          foo: 123.456,
          'a key': 'a value',
          obj: { abc: { def: 'ghi' } },
        }),
        '{"a key":"a value","foo":123.456,"obj":{"abc":{"def":"ghi",},},}',
      )
    })

    it('handles nested Object and Array instances', () => {
      expectHash(
        hashify({
          foo: 123.456,
          'a key': 'a value',
          obj: { arr: [{ def: 'ghi' }] },
        }),
        '{"a key":"a value","foo":123.456,"obj":{"arr":[{"def":"ghi",},],},}',
      )
    })
  })

  describe('hashArray', () => {
    it('handles Array instances', () => {
      expectHash(hashArray(['a string']), '["a string",]')
    })

    it('handles empty Array instances', () => {
      expectHash(hashArray([]), '[]')
    })
  })

  describe('hashObject', () => {
    it('handles Object instances', () => {
      expectHash(
        hashObject({ foo: 123.456, 'a key': 'a value' }),
        '{"a key":"a value","foo":123.456,}',
      )
    })

    it('handles nested Object instances', () => {
      expectHash(
        hashObject({
          foo: 123.456,
          'a key': 'a value',
          obj: { abc: { def: 'ghi' } },
        }),
        '{"a key":"a value","foo":123.456,"obj":{"abc":{"def":"ghi",},},}',
      )
    })

    it('handles nested Object and Array instances', () => {
      expectHash(
        hashObject({
          foo: 123.456,
          'a key': 'a value',
          obj: { arr: [{ def: 'ghi' }] },
        }),
        '{"a key":"a value","foo":123.456,"obj":{"arr":[{"def":"ghi",},],},}',
      )
    })
  })
})
