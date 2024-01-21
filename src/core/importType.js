/**
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 */

import { isBuiltin } from 'module'
import path from 'path'

import { getContextPackagePath } from './packagePath'

import resolve from 'eslint-module-utils/resolve'

/**
 * @param {string} name
 */
function baseModule(name) {
  if (isScoped(name)) {
    const [scope, pkg] = name.split('/')
    return `${scope}/${pkg}`
  }
  const [pkg] = name.split('/')
  return pkg
}

/**
 * @param {string} name
 * @param {RuleContext['settings']} settings
 */
function isInternalRegexMatch(name, settings) {
  const internalScope = /** @type {string | undefined} */ (
    settings?.['i/internal-regex']
  )
  return !!internalScope && new RegExp(internalScope).test(name)
}

/**
 * @param {string} name
 */
export function isAbsolute(name) {
  return typeof name === 'string' && path.isAbsolute(name)
}

/**
 * path is defined only when a resolver resolves to a non-standard path
 *
 * @param {string} name
 * @param {RuleContext['settings']} settings
 * @param {string} filepath
 */
export function isBuiltIn(name, settings, filepath) {
  if (filepath || !name) {
    return false
  }
  const base = baseModule(name)
  return isBuiltin(base) || settings?.['i/core-modules']?.includes(base)
}

/**
 * @param {string} name
 * @param {string} filepath
 * @param {object} context
 */
export function isExternalModule(name, filepath, context) {
  if (arguments.length < 3) {
    throw new TypeError(
      'isExternalModule: name, filepath, and context are all required',
    )
  }
  return (
    (isModule(name) || isScoped(name)) &&
    typeTest(name, context, filepath) === 'external'
  )
}

/**
 * @param {string} name
 * @param {string} filepath
 * @param {RuleContext} context
 */
export function isExternalModuleMain(name, filepath, context) {
  if (arguments.length < 3) {
    throw new TypeError(
      'isExternalModule: name, path, and context are all required',
    )
  }
  return isModuleMain(name) && typeTest(name, context, filepath) === 'external'
}

const moduleRegExp = /^\w/

/**
 * @param {string} name
 */
function isModule(name) {
  return !!name && moduleRegExp.test(name)
}

const moduleMainRegExp = /^\w((?!\/).)*$/

/**
 *
 * @param {string} name
 */
function isModuleMain(name) {
  return !!name && moduleMainRegExp.test(name)
}

const scopedRegExp = /^@[^/]+\/?[^/]+/

/**
 * @param {string} name
 */
export function isScoped(name) {
  return !!name && scopedRegExp.test(name)
}

const scopedMainRegExp = /^@[^/]+\/?[^/]+$/

/**
 * @param {string} name
 */
export function isScopedMain(name) {
  return !!name && scopedMainRegExp.test(name)
}

/**
 * @param {string} name
 */
function isRelativeToParent(name) {
  return /^\.\.$|^\.\.[/\\]/.test(name)
}

const indexFiles = new Set(['.', './', './index', './index.js'])

/**
 * @param {string} name
 */
function isIndex(name) {
  return indexFiles.has(name)
}

/**
 * @param {string} name
 */
function isRelativeToSibling(name) {
  return /^\.[/\\]/.test(name)
}

/**
 * @param {string} filepath
 * @param {RuleContext} context
 */
function isExternalPath(filepath, context) {
  if (!filepath) {
    return false
  }

  const { settings } = context
  const packagePath = getContextPackagePath(context)

  if (path.relative(packagePath, filepath).startsWith('..')) {
    return true
  }

  const folders = /** @type {string[] | undefined} */ (
    settings?.['i/external-module-folders']
  ) || ['node_modules']
  return folders.some(folder => {
    const folderPath = path.resolve(packagePath, folder)
    const relativePath = path.relative(folderPath, filepath)
    return !relativePath.startsWith('..')
  })
}

/**
 * @param {string} filepath
 * @param {RuleContext} context
 */
function isInternalPath(filepath, context) {
  if (!filepath) {
    return false
  }
  const packagePath = getContextPackagePath(context)
  return !path.relative(packagePath, filepath).startsWith('../')
}

/**
 * @param {string} name
 */
function isExternalLookingName(name) {
  return isModule(name) || isScoped(name)
}

/**
 * @param {string} name
 * @param {RuleContext} context
 * @param {string} filepath
 */
function typeTest(name, context, filepath) {
  const { settings } = context
  if (isInternalRegexMatch(name, settings)) {
    return 'internal'
  }
  if (isAbsolute(name, settings, filepath)) {
    return 'absolute'
  }
  if (isBuiltIn(name, settings, filepath)) {
    return 'builtin'
  }
  if (isRelativeToParent(name, settings, filepath)) {
    return 'parent'
  }
  if (isIndex(name, settings, filepath)) {
    return 'index'
  }
  if (isRelativeToSibling(name, settings, filepath)) {
    return 'sibling'
  }
  if (isExternalPath(filepath, context)) {
    return 'external'
  }
  if (isInternalPath(filepath, context)) {
    return 'internal'
  }
  if (isExternalLookingName(name)) {
    return 'external'
  }
  return 'unknown'
}

/**
 * @param {string} name
 * @param {RuleContext} context
 */
export default function resolveImportType(name, context) {
  return typeTest(name, context, resolve(name, context))
}
