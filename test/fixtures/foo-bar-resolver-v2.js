const assert = require('node:assert/strict')
const path = require('node:path')

const {
  useRuleContext,
  getTsconfigWithContext,
} = require('eslint-import-context')

exports.resolve = function (modulePath, sourceFile, config, _, options) {
  var sourceFileName = path.basename(sourceFile)
  const context = useRuleContext()
  assert.ok(context.cwd, 'the `context.cwd` must be present')
  const tsconfig = getTsconfigWithContext(context)
  const project = context.languageOptions?.parserOptions?.project
  if (project) {
    assert.ok(
      tsconfig,
      'the `tsconfig` must be present when `languageOptions.parserOptions.project` is set',
    )
  } else {
    assert.ok(
      !tsconfig,
      'the `tsconfig` must not be present when `languageOptions.parserOptions.project` is not set',
    )
  }
  if (sourceFileName === 'foo.js') {
    return {
      found: true,
      path: path.join(__dirname, project ? 'bar.tsx' : 'bar.jsx'),
    }
  }
  if (sourceFileName === 'exception.js') {
    throw new Error('foo-bar-resolver-v2 resolve test exception')
  }
  return { found: false }
}

exports.interfaceVersion = 2
