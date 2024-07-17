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
    settings['import-x/extensions'] || settings['import/extensions'] || ['.js'],
  )

  const parsers = settings['import-x/parsers'] || settings['import/parsers']

  // all alternate parser extensions are also valid
  if (parsers) {
    for (const parser in parsers) {
      const parserSettings = parsers[parser]
      if (!Array.isArray(parserSettings)) {
        throw new TypeError(`"settings" for ${parser} must be an array`)
      }
      for (const ext of parserSettings) exts.add(ext)
    }
  }

  return exts
}

// In ExportMap.for, ignore() is called after hasValidExtension() check.
// Add an argument to skip the check
export function ignore(
  filepath: string,
  context: ChildContext | RuleContext,
  skipExtensionCheck = false,
) {
  // check extension whitelist first (cheap)
  if (!skipExtensionCheck && !hasValidExtension(filepath, context)) {
    return true
  }

  const ignoreStrings =
    context.settings['import-x/ignore'] || context.settings['import/ignore']

  if (!ignoreStrings?.length) {
    return false
  }

  for (let i = 0, len = ignoreStrings.length; i < len; i++) {
    const ignoreString = ignoreStrings[i]
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
