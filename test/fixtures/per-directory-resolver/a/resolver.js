const path = require('node:path')

exports.resolve = function (modulePath) {
  return { found: true, path: path.join(__dirname, modulePath) }
}

exports.interfaceVersion = 2
