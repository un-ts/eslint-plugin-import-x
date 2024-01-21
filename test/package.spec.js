import fs from 'fs/promises'
import path from 'path'

import * as importPlugin from 'eslint-plugin-i'

function isJSFile(f) {
  return path.extname(f) === '.js'
}

function getRulePath(ruleName) {
  // 'require' does not work with dynamic paths because of the compilation step by babel
  // (which resolves paths according to the root folder configuration)
  // the usage of require.resolve on a static path gets around this
  return path.resolve(
    require.resolve('eslint-plugin-i/rules/no-unresolved'),
    '..',
    ruleName,
  )
}

describe('package', function () {
  const pkg = path.resolve('src')

  it('exists', function () {
    expect(importPlugin).toBeDefined()
  })

  it('has every rule', async () => {
    const files = await fs.readdir(path.resolve(pkg, 'rules'))
    for (const f of files.filter(isJSFile)) {
      expect(importPlugin.rules).toHaveProperty(path.basename(f, '.js'))
    }
  })

  it('exports all configs', async () => {
    const files = await fs.readdir(path.resolve(pkg, 'config'))
    for (const file of files.filter(isJSFile)) {
      if (file[0] === '.') {
        continue
      }
      expect(importPlugin.configs).toHaveProperty(path.basename(file, '.js'))
    }
  })

  it('has configs only for rules that exist', function () {
    for (const configFile in importPlugin.configs) {
      const preamble = 'i/'

      for (const rule in importPlugin.configs[configFile].rules) {
        expect(() =>
          require(getRulePath(rule.slice(preamble.length))),
        ).not.toThrow()
      }
    }
  })

  it('marks deprecated rules in their metadata', function () {
    expect(importPlugin.rules['imports-first'].meta.deprecated).toBe(true)
    expect(importPlugin.rules.first.meta.deprecated).not.toBe(true)
  })
})
