var assert = require('assert/strict')
var path = require('path')

exports.resolveImport = function (modulePath, sourceFile, config, _, options) {
  var sourceFileName = path.basename(sourceFile)
  if (sourceFileName === 'foo.js') {
    return path.join(__dirname, 'bar.jsx')
  }
  if (sourceFileName === 'exception.js') {
    throw new Error('foo-bar-resolver-v1 resolveImport test exception')
  }
  assert.ok(!_, 'the 4th argument must be undefined')
  assert.ok(options.context.cwd, 'the `context.cwd` must be present')
}
