import { parsePath, stringifyPath } from 'eslint-plugin-import-x/utils'

describe('parse-path', () => {
  it('should parse and stringify path expectedly', () => {
    const cases = [
      'foo',
      'foo?query',
      'foo#hash',
      'foo?query#hash',
      'foo#hash?query',
    ]

    for (const input of cases) {
      const output = parsePath(input)
      expect(output).toMatchSnapshot(input)
      expect(stringifyPath(output)).toBe(input)
    }
  })
})
