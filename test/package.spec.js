const path = require('path')
const fs = require('fs')

function isJSFile(f) {
  return path.extname(f) === '.js'
}

describe('package', () => {
  const pkg = path.resolve('src')

  let module

  beforeAll(() => {
    module = require(pkg)
  })

  it('exists', () => {
    expect(module).toBeDefined()
  })

  it('has every rule', done => {
    fs.readdir(path.join(pkg, 'rules'), function (err, files) {
      expect(err).toBeFalsy()

      files.filter(isJSFile).forEach(function (f) {
        expect(module.rules).toHaveProperty(path.basename(f, '.js'))
      })

      done()
    })
  })

  it('exports all configs', done => {
    fs.readdir(path.resolve('src', 'config'), function (err, files) {
      if (err) {
        done(err)
        return
      }
      files.filter(isJSFile).forEach(file => {
        if (file[0] === '.') {
          return
        }
        expect(module.configs).toHaveProperty(path.basename(file, '.js'))
      })
      done()
    })
  })

  it('has configs only for rules that exist', () => {
    for (const configFile in module.configs) {
      const preamble = 'import-x/'

      for (const rule in module.configs[configFile].rules) {
        expect(() =>
          require(getRulePath(rule.slice(preamble.length))),
        ).not.toThrow(Error)
      }
    }

    function getRulePath(ruleName) {
      // 'require' does not work with dynamic paths because of the compilation step by babel
      // (which resolves paths according to the root folder configuration)
      // the usage of require.resolve on a static path gets around this
      return path.resolve(
        require.resolve('rules/no-unresolved'),
        '..',
        ruleName,
      )
    }
  })

  it('marks deprecated rules in their metadata', () => {
    expect(module.rules['imports-first'].meta.deprecated).toBe(true)
    expect(module.rules.first.meta.deprecated).not.toBe(true)
  })
})
