import path from 'node:path'

import { createNodeResolver } from '../src/node-resolver'

const resolver = createNodeResolver()

function expectResolve(source: string, expected: boolean | string) {
  it(`${source} => ${expected}`, () => {
    let requireResolve: string | undefined

    try {
      requireResolve = require.resolve(source, { paths: [__dirname] })
    } catch {
      // ignore
    }

    expect({
      source,
      expected,
      requireResolve,
    }).toMatchSnapshot('require.resolve')

    const result = resolver.resolve(source, __filename)
    expect({
      source,
      expected,
      result,
    }).toMatchSnapshot('resolver')

    if (typeof expected === 'string') {
      expect(result.path).toBe(path.resolve(expected))
    } else {
      expect(result.found).toBe(expected)
    }
  })
}

describe('builtin', () => {
  expectResolve('path', true)
  expectResolve('node:path', true)
})

describe('modules', () => {
  expectResolve('jest', true)
  expectResolve('@sukka/does-not-exists', false)
})

describe('relative', () => {
  expectResolve('../package.json', 'package.json')
  expectResolve('../.github/dependabot.yml', false)
  expectResolve('../babel.config.js', 'babel.config.js')
  expectResolve('../test/index.js', 'test/index.js')
  expectResolve('../test/', 'test/index.js')
  expectResolve('../test', 'test/index.js')

  expectResolve('../inexistent.js', false)
})
