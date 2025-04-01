import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createNodeResolver } from 'eslint-plugin-import-x/node-resolver'

const resolver = createNodeResolver()

const require = createRequire(import.meta.url)

const _filename = fileURLToPath(import.meta.url)
const _dirname = path.dirname(_filename)

function expectResolve(source: string, expected: boolean | string) {
  it(`${source} => ${expected}`, () => {
    let requireResolve: string | undefined
    try {
      requireResolve = require.resolve(source, { paths: [_dirname] })
    } catch {
      // ignore
    }

    expect({
      source,
      expected,
      requireResolve,
    }).toMatchSnapshot()

    const result = resolver.resolve(source, _filename)
    expect({
      source,
      expected,
      result,
    }).toMatchSnapshot()

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
  expectResolve('vitest', true)
  expectResolve('@sukka/does-not-exists', false)
})

describe('relative', () => {
  expectResolve('../package.json', 'package.json')
  expectResolve('../.github/dependabot.yml', false)
  expectResolve('../babel.config.cjs', 'babel.config.cjs')
  expectResolve('../test/index.js', 'test/index.js')
  expectResolve('../test/', 'test/index.js')
  expectResolve('../test', 'test/index.js')

  expectResolve('../inexistent.js', false)
})
