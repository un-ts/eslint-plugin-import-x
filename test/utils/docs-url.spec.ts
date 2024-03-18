import pkg from 'eslint-plugin-import-x/package.json'
import { docsUrl } from 'eslint-plugin-import-x/utils'

describe('docsUrl', () => {
  it('returns the rule documentation URL when given a rule name', () => {
    expect(docsUrl('foo')).toBe(
      `https://github.com/un-ts/eslint-plugin-import-x/blob/v${pkg.version}/docs/rules/foo.md`,
    )
  })

  it('supports an optional commit-ish parameter', () => {
    expect(docsUrl('foo', 'bar')).toBe(
      'https://github.com/un-ts/eslint-plugin-import-x/blob/bar/docs/rules/foo.md',
    )
  })
})
