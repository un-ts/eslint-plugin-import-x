var path = require('path')

exports.foobarResolver = (/** @type {import('eslint-plugin-import-x/types').NewResolver} */ {
  name: 'resolver-foo-bar',
  interfaceVersion: 3,
  resolve: function (modulePath, sourceFile) {
    var sourceFileName = path.basename(sourceFile)
    if (sourceFileName === 'foo.js') {
      return { found: true, path: path.join(__dirname, 'bar.jsx') }
    }
    if (sourceFileName === 'exception.js') {
      throw new Error('foo-bar-resolver-v3 resolve test exception')
    }
    return { found: false }
  }
})
