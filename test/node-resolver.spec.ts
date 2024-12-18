import path from 'node:path'
import { cwd } from 'node:process'
import { createNodeResolver } from '../src/node-resolver';

const resolver = createNodeResolver()

function expectResolve(source: string, expected: boolean | string) {
  it(`${source} => ${expected}`, () => {
    try {
      console.log({ source, expected, requireResolve: require.resolve(source, { paths: [__dirname] }) })

    } catch {
      console.log({ source, expected, requireResolve: null })
    }
    const result = resolver.resolve(source, __filename);
    console.log({ source, expected, result })

    if (typeof expected === 'string') {
      expect(result.path).toBe(path.resolve(cwd(), expected))
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
