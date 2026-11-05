import { testContext } from '../utils.js'

import type { PluginSettings } from 'eslint-plugin-import-x'
import {
  childContext,
  fileExistsCache,
  makeContextCacheKey,
  relative,
} from 'eslint-plugin-import-x/utils'

const resolveTo = (path: string): PluginSettings => ({
  'import-x/resolver-next': [
    { interfaceVersion: 3, resolve: () => ({ found: true, path }) },
  ],
})

describe('childContext', () => {
  it('keeps large settings values out of the cache keys', () => {
    const large = 'a'.repeat(100_000)
    const context = testContext({
      ...resolveTo('/a'),
      'import-x/internal-regex': large,
    })

    expect(makeContextCacheKey(context)).not.toContain(large)
    expect(childContext('/foo.js', context).cacheKey).not.toContain(large)

    relative('large-settings', '/foo.js', context.settings, context)
    const keys = [...fileExistsCache.map.keys()]
    expect(keys.some(key => key.endsWith('large-settings'))).toBe(true)
    expect(keys.some(key => key.includes(large))).toBe(false)
  })

  it('gives settings with the same content the same key', () => {
    expect(
      makeContextCacheKey(testContext({ 'import-x/ignore': ['foo'] })),
    ).toBe(makeContextCacheKey(testContext({ 'import-x/ignore': ['foo'] })))
  })

  it('gives different settings different keys', () => {
    expect(
      makeContextCacheKey(testContext({ 'import-x/ignore': ['foo'] })),
    ).not.toBe(makeContextCacheKey(testContext({ 'import-x/ignore': ['bar'] })))
  })

  it('keeps settings passed to relative apart in the resolve cache', () => {
    const context = testContext(resolveTo('/a'))

    expect(relative('foo', '/foo.js', context.settings, context)).toBe('/a')
    expect(relative('foo', '/foo.js', resolveTo('/b'), context)).toBe('/b')
  })
})
