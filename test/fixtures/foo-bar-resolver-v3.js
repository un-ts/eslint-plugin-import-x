/** @import {NewResolver} from 'eslint-plugin-import-x' */

var assert = require('assert/strict')
var path = require('path')

/** @type {NewResolver} */
exports.foobarResolver = {
  name: 'resolver-foo-bar',
  interfaceVersion: 3,
  resolve(modulePath, sourceFile, options) {
    var sourceFileName = path.basename(sourceFile)
    if (sourceFileName === 'foo.js') {
      return { found: true, path: path.join(__dirname, 'bar.jsx') }
    }
    if (sourceFileName === 'exception.js') {
      throw new Error('foo-bar-resolver-v3 resolve test exception')
    }
    assert.ok(options.context.cwd, 'the `context.cwd` must be present')
    return { found: false }
  },
}
