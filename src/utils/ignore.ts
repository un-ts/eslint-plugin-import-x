import path from 'node:path'

import debug from 'debug'

import type {
  ChildContext,
  FileExtension,
  PluginSettings,
  RuleContext,
} from '../types'

const log = debug('eslint-plugin-import-x:utils:ignore')

// one-shot memoized
let cachedSet: Set<FileExtension>
let lastSettings: PluginSettings

function validExtensions(context: ChildContext | RuleContext) {
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
      for (const ext of parserSettings) exts.add(ext)
    }
  }

  return exts
}

export function ignore(filepath: string, context: ChildContext | RuleContext) {
  // check extension whitelist first (cheap)
  if (!hasValidExtension(filepath, context)) {
    return true
  }

  const ignoreStrings = context.settings['import-x/ignore']

  if (!ignoreStrings?.length) {
    return false
  }

  for (const ignoreString of ignoreStrings) {
    const regex = new RegExp(ignoreString)
    if (regex.test(filepath)) {
      log(`ignoring ${filepath}, matched pattern /${ignoreString}/`)
      return true
    }
  }

  return false
}

export function hasValidExtension(
  filepath: string,
  context: ChildContext | RuleContext,
): filepath is `${string}${FileExtension}` {
  return validExtensions(context).has(path.extname(filepath) as FileExtension)
}
