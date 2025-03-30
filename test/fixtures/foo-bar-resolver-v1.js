var path = require('path')

/**
 * @param {string} modulePath
 * @param {string} sourceFile
 * @param {unknown} config
 * @returns
 */
exports.resolveImport = function (modulePath, sourceFile, config) {
  var sourceFileName = path.basename(sourceFile)
  if (sourceFileName === 'foo.js') {
    return path.join(__dirname, 'bar.jsx')
  }
  if (sourceFileName === 'exception.js') {
    throw new Error('foo-bar-resolver-v1 resolveImport test exception')
  }
  return undefined
}

exports.interfaceVersion = 1
