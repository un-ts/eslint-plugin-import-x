/**
 * @typedef {import('eslint').Linter.ParserModule} ParserModule
 * @typedef {import('eslint').Rule.RuleContext} RuleContext
 * @typedef {import('eslint').AST.Program} Program
 * @typedef {import('eslint').SourceCode.VisitorKeys} VisitorKeys
 * @typedef {import('eslint').Linter.ESLintParseResult} ESLintParseResult
 */

'use strict'

const fs = require('fs')
const path = require('path')

const log = require('debug')('eslint-plugin-i:parse')

const moduleRequire = require('./module-require')

/**
 *
 * @param {string} parserPath
 * @returns {VisitorKeys}
 */
function getBabelEslintVisitorKeys(parserPath) {
  if (parserPath.endsWith('index.js')) {
    const hypotheticalLocation = parserPath.replace(
      'index.js',
      'visitor-keys.js',
    )
    if (fs.existsSync(hypotheticalLocation)) {
      const keys = moduleRequire(hypotheticalLocation)
      return keys.default || keys
    }
  }
  return null
}

/**
 *
 * @param {string} parserPath
 * @param {ParserModule} parserInstance
 * @param {ESLintParseResult} [parsedResult]
 * @returns
 */
function keysFromParser(parserPath, parserInstance, parsedResult) {
  // Exposed by @typescript-eslint/parser and @babel/eslint-parser
  if (parsedResult && parsedResult.visitorKeys) {
    return parsedResult.visitorKeys
  }
  if (typeof parserPath === 'string' && /([/\\])espree\1/.test(parserPath)) {
    return /** @type {VisitorKeys} */ (parserInstance.VisitorKeys)
  }
  if (
    typeof parserPath === 'string' &&
    (/([/\\])babel-eslint\1/.test(parserPath) ||
      /([/\\])@babel\/eslint-parser\1/.test(parserPath))
  ) {
    return getBabelEslintVisitorKeys(parserPath)
  }
  return null
}

/**
 * this exists to smooth over the unintentional breaking change in v2.7.
 *
 * @param {Program | ESLintParseResult | null} ast
 * @param {VisitorKeys} visitorKeys
 */
function makeParseReturn(ast, visitorKeys) {
  if (!ast) {
    return ast
  }

  if ('ast' in ast) {
    return ast
  }

  return {
    ast,
    visitorKeys,
  }
}

function stripUnicodeBOM(text) {
  return text.codePointAt(0) === 0xfe_ff ? text.slice(1) : text
}

function transformHashbang(text) {
  return text.replace(/^#!([^\r\n]+)/u, (_, captured) => `//${captured}`)
}

/**
 * @param {string} path
 * @param {string} content
 * @param {RuleContext} context
 * @returns
 */
module.exports = function parse(path, content, context) {
  if (context == null) {
    throw new Error('need context to parse properly')
  }

  // ESLint in "flat" mode only sets context.languageOptions.parserOptions
  let parserOptions =
    (context.languageOptions && context.languageOptions.parserOptions) ||
    context.parserOptions

  const parserOrPath = getParser(path, context)

  if (!parserOrPath) {
    throw new Error('parserPath or languageOptions.parser is required!')
  }

  // hack: espree blows up with frozen options
  parserOptions = Object.assign({}, parserOptions)
  parserOptions.ecmaFeatures = Object.assign({}, parserOptions.ecmaFeatures)

  // always include comments and tokens (for doc parsing)
  parserOptions.comment = true
  parserOptions.attachComment = true // keeping this for backward-compat with  older parsers
  parserOptions.tokens = true

  // attach node locations
  parserOptions.loc = true
  parserOptions.range = true

  // provide the `filePath` like eslint itself does, in `parserOptions`
  // https://github.com/eslint/eslint/blob/3ec436ee/lib/linter.js#L637
  parserOptions.filePath = path

  // @typescript-eslint/parser will parse the entire project with typechecking if you provide
  // "project" or "projects" in parserOptions. Removing these options means the parser will
  // only parse one file in isolate mode, which is much, much faster.
  // https://github.com/import-js/eslint-plugin-import/issues/1408#issuecomment-509298962
  delete parserOptions.project
  delete parserOptions.projects

  // require the parser relative to the main module (i.e., ESLint)
  const parser =
    typeof parserOrPath === 'string'
      ? /** @type {ParserModule} */ (moduleRequire(parserOrPath))
      : parserOrPath

  // replicate bom strip and hashbang transform of ESLint
  // https://github.com/eslint/eslint/blob/b93af98b3c417225a027cabc964c38e779adb945/lib/linter/linter.js#L779
  content = transformHashbang(stripUnicodeBOM(String(content)))

  if (
    'parseForESLint' in parser &&
    typeof parser.parseForESLint === 'function'
  ) {
    /**
     * @type {Program | undefined}
     */
    let ast
    try {
      const parserRaw = parser.parseForESLint(content, parserOptions)
      ast = parserRaw.ast
      return makeParseReturn(
        parserRaw,
        keysFromParser(parserOrPath, parser, parserRaw),
      )
    } catch (error) {
      console.warn()
      console.warn('Error while parsing ' + parserOptions.filePath)
      console.warn(
        'Line ' +
          error.lineNumber +
          ', column ' +
          error.column +
          ': ' +
          error.message,
      )
    }
    if (!ast || typeof ast !== 'object') {
      console.warn(
        // Can only be invalid for custom parser per imports/parser
        '`parseForESLint` from parser `' +
          (typeof parserOrPath === 'string'
            ? parserOrPath
            : '`context.languageOptions.parser`') +
          '` is invalid and will just be ignored',
      )
    } else {
      return makeParseReturn(ast, keysFromParser(parserOrPath, parser))
    }
  }

  const ast = 'parse' in parser ? parser.parse(content, parserOptions) : null
  return makeParseReturn(ast, keysFromParser(parserOrPath, parser))
}

/**
 * @param {string} filepath
 * @param {RuleContext} context
 */
function getParser(filepath, context) {
  const parserPath = getParserPath(filepath, context)
  if (parserPath) {
    return parserPath
  }
  const isFlat =
    context.languageOptions &&
    context.languageOptions.parser &&
    typeof context.languageOptions.parser !== 'string' &&
    (typeof context.languageOptions.parser.parse === 'function' ||
      typeof context.languageOptions.parser.parseForESLint === 'function')

  return isFlat ? context.languageOptions.parser : null
}

/**
 * @param {string} filepath
 * @param {RuleContext} context
 */
function getParserPath(filepath, context) {
  const parsers = context.settings['i/parsers']
  if (parsers != null) {
    const extension = path.extname(filepath)
    for (const parserPath in parsers) {
      if (parsers[parserPath].includes(extension)) {
        // use this alternate parser
        log('using alt parser:', parserPath)
        return parserPath
      }
    }
  }
  // default to use ESLint parser
  return context.parserPath
}
