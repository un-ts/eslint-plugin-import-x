import isIgnored, {
  getFileExtensions,
  hasValidExtension,
} from '../../src/utils/ignore'

import * as utils from '../utils'

describe('ignore', () => {
  describe('isIgnored', () => {
    it('ignores paths with extensions other than .js', () => {
      const testContext = utils.testContext({})

      expect(isIgnored('../fixtures/foo.js', testContext)).toBe(false)

      expect(isIgnored('../fixtures/bar.jsx', testContext)).toBe(true)

      expect(isIgnored('../fixtures/typescript.ts', testContext)).toBe(true)

      expect(
        isIgnored('../fixtures/ignore.invalid.extension', testContext),
      ).toBe(true)
    })

    it('ignores paths with invalid extensions when configured with import-x/extensions', () => {
      const testContext = utils.testContext({
        'import-x/extensions': ['.js', '.jsx', '.ts'],
      })

      expect(isIgnored('../fixtures/foo.js', testContext)).toBe(false)

      expect(isIgnored('../fixtures/bar.jsx', testContext)).toBe(false)

      expect(isIgnored('../fixtures/typescript.ts', testContext)).toBe(false)

      expect(
        isIgnored('../fixtures/ignore.invalid.extension', testContext),
      ).toBe(true)
    })
  })

  describe('hasValidExtension', () => {
    it('assumes only .js as valid by default', () => {
      const testContext = utils.testContext({})

      expect(hasValidExtension('../fixtures/foo.js', testContext)).toBe(true)

      expect(hasValidExtension('../fixtures/foo.jsx', testContext)).toBe(false)

      expect(hasValidExtension('../fixtures/foo.css', testContext)).toBe(false)

      expect(
        hasValidExtension('../fixtures/foo.invalid.extension', testContext),
      ).toBe(false)
    })

    it('can be configured with import-x/extensions', () => {
      const testContext = utils.testContext({
        'import-x/extensions': ['.foo', '.bar'],
      })

      expect(hasValidExtension('../fixtures/foo.foo', testContext)).toBe(true)

      expect(hasValidExtension('../fixtures/foo.bar', testContext)).toBe(true)

      expect(hasValidExtension('../fixtures/foo.js', testContext)).toBe(false)
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
