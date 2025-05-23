var assert = require('assert/strict')
var path = require('path')

exports.resolveImport = function (modulePath, sourceFile, config, _, options) {
  var sourceFileName = path.basename(sourceFile)
  const project = options.context.languageOptions?.parserOptions?.project
  if (project) {
    assert.ok(
      options.tsconfig,
      'the `tsconfig` must be present when `languageOptions.parserOptions.project` is set',
    )
  } else {
    assert.ok(
      !options.tsconfig,
      'the `tsconfig` must not be present when `parserOptions.project` is not set',
    )
  }
  if (sourceFileName === 'foo.js') {
    return path.join(__dirname, project ? 'bar.tsx' : 'bar.jsx')
  }
  if (sourceFileName === 'exception.js') {
    throw new Error('foo-bar-resolver-v1 resolveImport test exception')
  }
  assert.ok(!_, 'the 4th argument must be undefined')
  assert.ok(options.context.cwd, 'the `context.cwd` must be present')
}
