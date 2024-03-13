import { extname } from 'path'

import debug from 'debug'

import type { ChildContext, FileExtension, PluginSettings } from '../types'

const log = debug('eslint-plugin-import-x:utils:ignore')

// one-shot memoized
let cachedSet: Set<FileExtension>
let lastSettings: PluginSettings

function validExtensions(context: ChildContext) {
  if (cachedSet && context.settings === lastSettings) {
    return cachedSet
  }

  lastSettings = context.settings
  cachedSet = getFileExtensions(context.settings)
  return cachedSet
}

export function getFileExtensions(settings: PluginSettings) {
  // start with explicit JS-parsed extensions
  const exts = new Set<FileExtension>(
    settings['import-x/extensions'] || ['.js'],
  )

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

export function ignore(path: string, context: ChildContext) {
  // check extension whitelist first (cheap)
  if (!hasValidExtension(path, context)) {
    return true
  }

  const ignoreStrings = context.settings['import-x/ignore']

  if (!ignoreStrings?.length) {
    return false
  }

  for (let i = 0; i < ignoreStrings.length; i++) {
    const regex = new RegExp(ignoreStrings[i])
    if (regex.test(path)) {
      log(`ignoring ${path}, matched pattern /${ignoreStrings[i]}/`)
      return true
    }
  }

  return false
}

export function hasValidExtension(
  path: string,
  context: ChildContext,
): path is `${string}${FileExtension}` {
  return validExtensions(context).has(extname(path) as FileExtension)
}
