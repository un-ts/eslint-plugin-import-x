import { extname } from 'path'

import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import debug from 'debug'

import { moduleRequire } from './module-require'
import { ChildContext, FileExtension, RuleContext } from '../types'

const log = debug('eslint-plugin-import-x:parse')

function keysFromParser(
  parserPath: string | TSESLint.Linter.ParserModule,
  parserInstance: TSESLint.Linter.ParserModule,
  parsedResult?: TSESLint.Linter.ESLintParseResult,
) {
  // Exposed by @typescript-eslint/parser and @babel/eslint-parser
  if (parsedResult && parsedResult.visitorKeys) {
    return parsedResult.visitorKeys
  }
  if (typeof parserPath === 'string' && /.*espree.*/.test(parserPath)) {
    // @ts-expect-error - no type yet
    return parserInstance.VisitorKeys as TSESLint.SourceCode.VisitorKeys
  }
  return null
}

function makeParseReturn(
  ast: TSESTree.Program,
  visitorKeys: TSESLint.SourceCode.VisitorKeys | null,
) {
  return {
    ast,
    visitorKeys,
  }
}

function stripUnicodeBOM(text: string) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function transformHashbang(text: string) {
  return text.replace(/^#!([^\r\n]+)/u, (_, captured) => `//${captured}`)
}

export function parse(
  path: string,
  content: string,
  context: ChildContext | RuleContext,
) {
  if (context == null) {
    throw new Error('need context to parse properly')
  }

  // ESLint in "flat" mode only sets context.languageOptions.parserOptions
  let parserOptions =
    ('languageOptions' in context && context.languageOptions?.parserOptions) ||
    context.parserOptions

  const parserOrPath = getParser(path, context)

  if (!parserOrPath) {
    throw new Error('parserPath or languageOptions.parser is required!')
  }

  // hack: espree blows up with frozen options
  parserOptions = { ...parserOptions }
  parserOptions.ecmaFeatures = { ...parserOptions.ecmaFeatures }

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
  delete parserOptions.EXPERIMENTAL_useProjectService
  delete parserOptions.project
  delete parserOptions.projects

  // require the parser relative to the main module (i.e., ESLint)
  const parser =
    typeof parserOrPath === 'string'
      ? moduleRequire<TSESLint.Linter.ParserModule>(parserOrPath)
      : parserOrPath

  // replicate bom strip and hashbang transform of ESLint
  // https://github.com/eslint/eslint/blob/b93af98b3c417225a027cabc964c38e779adb945/lib/linter/linter.js#L779
  content = transformHashbang(stripUnicodeBOM(String(content)))

  if (
    'parseForESLint' in parser &&
    typeof parser.parseForESLint === 'function'
  ) {
    let ast: TSESTree.Program | undefined
    try {
      const parserRaw = parser.parseForESLint(content, parserOptions)
      ast = parserRaw.ast
      return makeParseReturn(
        ast,
        keysFromParser(parserOrPath, parser, parserRaw),
      )
    } catch (e) {
      console.warn()
      console.warn(`Error while parsing ${parserOptions.filePath}`)
      // @ts-expect-error e is almost certainly an Error here
      console.warn(`Line ${e.lineNumber}, column ${e.column}: ${e.message}`)
    }
    if (!ast || typeof ast !== 'object') {
      console.warn(
        // Can only be invalid for custom parser per imports/parser
        `\`parseForESLint\` from parser \`${typeof parserOrPath === 'string' ? parserOrPath : '`context.languageOptions.parser`'}\` is invalid and will just be ignored`,
      )
    } else {
      return makeParseReturn(ast, keysFromParser(parserOrPath, parser))
    }
  }

  if ('parse' in parser) {
    const ast = parser.parse(content, parserOptions)
    return makeParseReturn(ast, keysFromParser(parserOrPath, parser, undefined))
  }

  throw new Error('Parser must expose a `parse` or `parseForESLint` method')
}

function getParser(path: string, context: ChildContext | RuleContext) {
  const parserPath = getParserPath(path, context)

  if (parserPath) {
    return parserPath
  }

  const parser = 'languageOptions' in context && context.languageOptions?.parser

  if (
    parser &&
    typeof parser !== 'string' &&
    (('parse' in parser && typeof parse === 'function') ||
      ('parseForESLint' in parser &&
        typeof parser.parseForESLint === 'function'))
  ) {
    return parser
  }

  return null
}

function getParserPath(path: string, context: ChildContext | RuleContext) {
  const parsers = context.settings['import-x/parsers']
  if (parsers != null) {
    const extension = extname(path) as FileExtension
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
