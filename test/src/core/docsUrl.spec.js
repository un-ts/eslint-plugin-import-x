import pkg from '../../../package.json'
import docsUrl from '../../../src/docsUrl'

describe('docsUrl', function () {
  it('returns the rule documentation URL when given a rule name', function () {
    expect(docsUrl('foo')).toEqual(
      `https://github.com/import-js/eslint-plugin-import/blob/v${pkg.version}/docs/rules/foo.md`,
    )
  })

  it('supports an optional commit-ish parameter', function () {
    expect(docsUrl('foo', 'bar')).toEqual(
      'https://github.com/import-js/eslint-plugin-import/blob/bar/docs/rules/foo.md',
    )
  })
})
