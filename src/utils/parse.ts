import nodePath from 'node:path'

// import { withoutProjectParserOptions } from '@typescript-eslint/typescript-estree'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import debug from 'debug'

import type {
  ChildContext,
  FileExtension,
  ParseError,
  RuleContext,
} from '../types.js'

import { moduleRequire } from './module-require.js'

// https://github.com/nuxt/eslint/issues/494
function withoutProjectParserOptions(
  opts: TSESLint.ParserOptions,
): Exclude<
  TSESLint.ParserOptions,
  'EXPERIMENTAL_useProjectService' | 'project' | 'projectService'
> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- The variables are meant to be omitted
  const { EXPERIMENTAL_useProjectService, project, projectService, ...rest } =
    opts
  return rest
}

const log = debug('eslint-plugin-import-x:parse')

function keysFromParser(
  _parserPath: string | TSESLint.Parser.ParserModule,
  parserInstance: TSESLint.Parser.ParserModule,
  parsedResult?: TSESLint.Parser.ParseResult,
) {
  // Exposed by @typescript-eslint/parser and @babel/eslint-parser
  if (parsedResult && parsedResult.visitorKeys) {
    return parsedResult.visitorKeys
  }

  // The espree parser doesn't have the `parseForESLint` function, so we don't ended up with a
  // `parsedResult` here, but it does expose the visitor keys on the parser instance that we can use.
  if (
    parserInstance &&
    'VisitorKeys' in parserInstance &&
    parserInstance.VisitorKeys
  ) {
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
  return text.codePointAt(0) === 0xfe_ff ? text.slice(1) : text
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
    context.languageOptions?.parserOptions || context.parserOptions

  const parserOrPath = getParserOrPath(path, context)

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
  parserOptions = withoutProjectParserOptions(parserOptions)

  // If this is a flat config, we need to add ecmaVersion and sourceType (if present) from languageOptions
  parserOptions.ecmaVersion ??= context.languageOptions?.ecmaVersion
  parserOptions.sourceType ??= context.languageOptions?.sourceType

  // require the parser relative to the main module (i.e., ESLint)
  const parser =
    typeof parserOrPath === 'string'
      ? moduleRequire<TSESLint.Parser.ParserModule>(
          parserOrPath,
          context.physicalFilename,
        )
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
    } catch (error_) {
      const error = error_ as ParseError
      console.warn(`Error while parsing ${parserOptions.filePath}`)
      console.warn(
        `Line ${error.lineNumber}, column ${error.column}: ${error.message}`,
      )
    }
    if (!ast || typeof ast !== 'object') {
      console.warn(
        // Can only be invalid for custom parser per imports/parser
        `\`parseForESLint\` from parser \`${typeof parserOrPath === 'string' ? parserOrPath : 'context.languageOptions.parser'}\` is invalid and will just be ignored`,
        { content, parserMeta: parser.meta },
      )
    } else {
      return makeParseReturn(ast, keysFromParser(parserOrPath, parser))
    }
  }

  if ('parse' in parser) {
    const ast = parser.parse(content, parserOptions)
    return makeParseReturn(ast, keysFromParser(parserOrPath, parser))
  }

  throw new Error('Parser must expose a `parse` or `parseForESLint` method')
}

function getParserOrPath(path: string, context: ChildContext | RuleContext) {
  const parsers = context.settings['import-x/parsers']
  if (parsers != null) {
    const extension = nodePath.extname(path) as FileExtension
    for (const parserPath in parsers) {
      if (parsers[parserPath].includes(extension)) {
        // use this alternate parser
        log('using alt parser:', parserPath)
        return parserPath
      }
    }
  }
  // default to use ESLint parser, only exists in eslintrc
  if ('parserPath' in context && context.parserPath) {
    log('using context.parserPath:', context.parserPath)
    return context.parserPath
  }

  const parser = 'languageOptions' in context && context.languageOptions?.parser

  if (
    parser &&
    typeof parser !== 'string' &&
    (('parse' in parser && typeof parse === 'function') ||
      ('parseForESLint' in parser &&
        typeof parser.parseForESLint === 'function'))
  ) {
    return parser as TSESLint.Parser.ParserModule
  }

  return null
}
