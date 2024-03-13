import {
  ignore as isIgnored,
  getFileExtensions,
  hasValidExtension,
} from '../../src/utils/ignore'

import { testContext } from '../utils'

describe('ignore', () => {
  describe('isIgnored', () => {
    it('ignores paths with extensions other than .js', () => {
      const context = testContext({})

      expect(isIgnored('../fixtures/foo.js', context)).toBe(false)

      expect(isIgnored('../fixtures/bar.jsx', context)).toBe(true)

      expect(isIgnored('../fixtures/typescript.ts', context)).toBe(true)

      expect(isIgnored('../fixtures/ignore.invalid.extension', context)).toBe(
        true,
      )
    })

    it('ignores paths with invalid extensions when configured with import-x/extensions', () => {
      const context = testContext({
        'import-x/extensions': ['.js', '.jsx', '.ts'],
      })

      expect(isIgnored('../fixtures/foo.js', context)).toBe(false)

      expect(isIgnored('../fixtures/bar.jsx', context)).toBe(false)

      expect(isIgnored('../fixtures/typescript.ts', context)).toBe(false)

      expect(isIgnored('../fixtures/ignore.invalid.extension', context)).toBe(
        true,
      )
    })
  })

  describe('hasValidExtension', () => {
    it('assumes only .js as valid by default', () => {
      const context = testContext({})

      expect(hasValidExtension('../fixtures/foo.js', context)).toBe(true)

      expect(hasValidExtension('../fixtures/foo.jsx', context)).toBe(false)

      expect(hasValidExtension('../fixtures/foo.css', context)).toBe(false)

      expect(
        hasValidExtension('../fixtures/foo.invalid.extension', context),
      ).toBe(false)
    })

    it('can be configured with import-x/extensions', () => {
      const context = testContext({
        'import-x/extensions': ['.foo', '.bar'],
      })

      expect(hasValidExtension('../fixtures/foo.foo', context)).toBe(true)

      expect(hasValidExtension('../fixtures/foo.bar', context)).toBe(true)

      expect(hasValidExtension('../fixtures/foo.js', context)).toBe(false)
    })
  })

  describe('getFileExtensions', () => {
    it('returns a set with the file extension ".js" if "import-x/extensions" is not configured', () => {
      const fileExtensions = getFileExtensions({})

      expect(fileExtensions).toContain('.js')
    })

    it('returns a set with the file extensions configured in "import-x/extension"', () => {
      const settings = {
        'import-x/extensions': ['.js', '.jsx'],
      }

      const fileExtensions = getFileExtensions(settings)

      expect(fileExtensions).toContain('.js')
      expect(fileExtensions).toContain('.jsx')
    })

    it('returns a set with the file extensions configured in "import-x/extension" and "import-x/parsers"', () => {
      const settings = {
        'import-x/parsers': {
          '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
      }

      const fileExtensions = getFileExtensions(settings)

      expect(fileExtensions).toContain('.js') // If "import-x/extensions" is not configured, this is the default
      expect(fileExtensions).toContain('.ts')
      expect(fileExtensions).toContain('.tsx')
    })
  })
})
