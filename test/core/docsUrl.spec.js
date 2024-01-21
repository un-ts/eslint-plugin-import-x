import docsUrl from 'eslint-plugin-i/docsUrl'
import pkg from 'eslint-plugin-i/package.json'

describe('docsUrl', function () {
  it('returns the rule documentation URL when given a rule name', function () {
    expect(docsUrl('foo')).toEqual(
      `https://github.com/un-es/eslint-plugin-i/blob/v${pkg.version}/docs/rules/foo.md`,
    )
  })

  it('supports an optional commit-ish parameter', function () {
    expect(docsUrl('foo', 'bar')).toEqual(
      'https://github.com/un-es/eslint-plugin-i/blob/bar/docs/rules/foo.md',
    )
  })
})
