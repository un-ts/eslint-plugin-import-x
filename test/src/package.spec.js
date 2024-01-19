const fs = require('fs/promises')
const path = require('path')

function isJSFile(f) {
  return path.extname(f) === '.js'
}

describe('package', function () {
  const pkg = path.join(process.cwd(), 'src')
  let module

  beforeEach('is importable', function () {
    module = require(pkg)
  })

  it('exists', function () {
    expect(module).toBeDefined()
  })

  it('has every rule', async () => {
    const files = await fs.readdir(path.join(pkg, 'rules'))
    files.filter(isJSFile).forEach(function (f) {
      expect(module.rules).toHaveProperty(path.basename(f, '.js'))
    })
  })

  it('exports all configs', async () => {
    const files = await fs.readdir(path.join(process.cwd(), 'config'))
    files.filter(isJSFile).forEach(file => {
      if (file[0] === '.') {
        return
      }
      expect(module.configs).toHaveProperty(path.basename(file, '.js'))
    })
  })

  it('has configs only for rules that exist', function () {
    for (const configFile in module.configs) {
      const preamble = 'i/'

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

  it('marks deprecated rules in their metadata', function () {
    expect(module.rules['imports-first'].meta.deprecated).toBe(true)
    expect(module.rules.first.meta.deprecated).not.toBe(true)
  })
})
