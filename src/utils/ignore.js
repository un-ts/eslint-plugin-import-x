'use strict'

exports.__esModule = true

const extname = require('path').extname

const log = require('debug')('eslint-plugin-import-x:utils:ignore')

// one-shot memoized
/** @type {Set<import('./types').Extension>} */ let cachedSet
/** @type {import('./types').ESLintSettings} */ let lastSettings

/** @type {(context: import('eslint').Rule.RuleContext) => Set<import('./types').Extension>} */
function validExtensions(context) {
  if (cachedSet && context.settings === lastSettings) {
    return cachedSet
  }

  lastSettings = context.settings
  cachedSet = makeValidExtensionSet(context.settings)
  return cachedSet
}

/** @type {import('./ignore').getFileExtensions} */
function makeValidExtensionSet(settings) {
  // start with explicit JS-parsed extensions
  /** @type {Set<import('./types').Extension>} */
  const exts = new Set(settings['import-x/extensions'] || ['.js'])

  // all alternate parser extensions are also valid
  if ('import-x/parsers' in settings) {
    for (const parser in settings['import-x/parsers']) {
      const parserSettings = settings['import-x/parsers'][parser]
      if (!Array.isArray(parserSettings)) {
        throw new TypeError(`"settings" for ${parser} must be an array`)
      }
      parserSettings.forEach(ext => exts.add(ext))
    }
  }

  return exts
}
exports.getFileExtensions = makeValidExtensionSet

/** @type {import('./ignore').default} */
exports.default = function ignore(path, context) {
  // check extension whitelist first (cheap)
  if (!hasValidExtension(path, context)) {
    return true
  }

  if (!('import-x/ignore' in context.settings)) {
    return false
  }
  const ignoreStrings = context.settings['import-x/ignore']

  for (let i = 0; i < ignoreStrings.length; i++) {
    const regex = new RegExp(ignoreStrings[i])
    if (regex.test(path)) {
      log(`ignoring ${path}, matched pattern /${ignoreStrings[i]}/`)
      return true
    }
  }

  return false
}

/** @type {import('./ignore').hasValidExtension} */
function hasValidExtension(path, context) {
  // eslint-disable-next-line no-extra-parens
  return validExtensions(context).has(
    /** @type {import('./types').Extension} */ (extname(path)),
  )
}
exports.hasValidExtension = hasValidExtension
