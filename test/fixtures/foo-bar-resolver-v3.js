/** @import {NewResolver} from 'eslint-plugin-import-x' */

var assert = require('assert/strict')
var path = require('path')

/** @type {NewResolver} */
exports.foobarResolver = {
  name: 'resolver-foo-bar',
  interfaceVersion: 3,
  resolve(modulePath, sourceFile, options) {
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
      return {
        found: true,
        path: path.join(__dirname, project ? 'bar.tsx' : 'bar.jsx'),
      }
    }
    if (sourceFileName === 'exception.js') {
      throw new Error('foo-bar-resolver-v3 resolve test exception')
    }
    assert.ok(options.context.cwd, 'the `context.cwd` must be present')
    return { found: false }
  },
}
