import { isBuiltin } from 'node:module'
import path from 'node:path'

import type { LiteralNodeValue, PluginSettings, RuleContext } from '../types.js'

import { getContextPackagePath } from './package-path.js'
import { resolve } from './resolve.js'

function baseModule(name: string) {
  if (isScoped(name)) {
    const [scope, pkg] = name.split('/')
    return `${scope}/${pkg}`
  }
  const [pkg] = name.split('/')
  return pkg
}

function isInternalRegexMatch(name: string, settings: PluginSettings) {
  const internalScope = settings?.['import-x/internal-regex']
  return internalScope && new RegExp(internalScope).test(name)
}

export function isAbsolute(name?: LiteralNodeValue) {
  return typeof name === 'string' && path.isAbsolute(name)
}

// path is defined only when a resolver resolves to a non-standard path
export function isBuiltIn(
  name: string,
  settings: PluginSettings,
  modulePath?: string | null,
) {
  if (modulePath || !name) {
    return false
  }
  const base = baseModule(name)
  const extras = (settings && settings['import-x/core-modules']) || []
  return isBuiltin(base) || extras.includes(base)
}

export function isExternalModule(
  name: string,
  modulePath: string,
  context: RuleContext,
) {
  return (
    (isModule(name) || isScoped(name)) &&
    typeTest(name, context, modulePath) === 'external'
  )
}

export function isExternalModuleMain(
  name: string,
  modulePath: string,
  context: RuleContext,
) {
  if (arguments.length < 3) {
    throw new TypeError(
      'isExternalModule: name, path, and context are all required',
    )
  }
  return (
    isModuleMain(name) && typeTest(name, context, modulePath) === 'external'
  )
}

const moduleRegExp = /^\w/

function isModule(name: string) {
  return !!name && moduleRegExp.test(name)
}

const moduleMainRegExp = /^\w((?!\/).)*$/

function isModuleMain(name: string) {
  return !!name && moduleMainRegExp.test(name)
}

const scopedRegExp = /^@[^/]+\/?[^/]+/

export function isScoped(name: string) {
  return !!name && scopedRegExp.test(name)
}

const scopedMainRegExp = /^@[^/]+\/?[^/]+$/

export function isScopedMain(name: string) {
  return !!name && scopedMainRegExp.test(name)
}

function isMapped(name: string) {
  return name.startsWith('#')
}

function isRelativeToParent(name: string) {
  return /^\.\.$|^\.\.[/\\]/.test(name)
}

const indexFiles = new Set(['.', './', './index', './index.js'])

function isIndex(name: string) {
  return indexFiles.has(name)
}

function isRelativeToSibling(name: string) {
  return /^\.[/\\]/.test(name)
}

function isExternalPath(
  filepath: string | null | undefined,
  context: RuleContext,
) {
  if (!filepath) {
    return false
  }

  const { settings } = context
  const packagePath = getContextPackagePath(context)

  if (path.relative(packagePath, filepath).startsWith('..')) {
    return true
  }

  const folders = settings?.['import-x/external-module-folders'] || [
    'node_modules',
  ]
  return folders.some(folder => {
    const folderPath = path.resolve(packagePath, folder)
    const relativePath = path.relative(folderPath, filepath)
    return !relativePath.startsWith('..')
  })
}

function isInternalPath(
  filepath: string | null | undefined,
  context: RuleContext,
) {
  if (!filepath) {
    return false
  }
  const packagePath = getContextPackagePath(context)
  return !path.relative(packagePath, filepath).startsWith('../')
}

function isExternalLookingName(name: string) {
  return isModule(name) || isScoped(name)
}

function typeTest(
  name: LiteralNodeValue,
  context: RuleContext,
  path?: string | null,
) {
  const { settings } = context
  if (typeof name === 'string') {
    if (isInternalRegexMatch(name, settings)) {
      return 'internal'
    }
    if (isAbsolute(name)) {
      return 'absolute'
    }
    if (isBuiltIn(name, settings, path)) {
      return 'builtin'
    }
    if (isMapped(name)) {
      return 'mapped'
    }
    if (isRelativeToParent(name)) {
      return 'parent'
    }
    if (isIndex(name)) {
      return 'index'
    }
    if (isRelativeToSibling(name)) {
      return 'sibling'
    }
  }
  if (isExternalPath(path, context)) {
    return 'external'
  }
  if (isInternalPath(path, context)) {
    return 'internal'
  }
  if (typeof name === 'string' && isExternalLookingName(name)) {
    return 'external'
  }
  return 'unknown'
}

export function importType(name: LiteralNodeValue, context: RuleContext) {
  return typeTest(
    name,
    context,
    typeof name === 'string' ? resolve(name, context) : null,
  )
}

export type ImportType = ReturnType<typeof importType>
