import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { ResolveOptions } from 'enhanced-resolve'
import type { TsResolverOptions } from 'eslint-import-resolver-typescript'
import type { MinimatchOptions } from 'minimatch'
import type { KebabCase, LiteralUnion } from 'type-fest'

import type { ImportType as ImportType_, PluginName } from './utils'

export type ImportType = ImportType_ | 'object' | 'type'

export type NodeResolverOptions = {
  extensions?: readonly string[]
  moduleDirectory?: string[]
  paths?: string[]
}

export type WebpackResolverOptions = {
  config?: string | { resolve: Omit<ResolveOptions, 'fileSystem'> }
  'config-index'?: number
  env?: Record<string, unknown>
  argv?: Record<string, unknown>
}

export type FileExtension = `.${string}`

export type DocStyle = 'jsdoc' | 'tomdoc'

export type Arrayable<T> = T | readonly T[]

export type ImportResolver =
  | LiteralUnion<'node' | 'typescript' | 'webpack', string>
  | {
      node?: boolean | NodeResolverOptions
      typescript?: boolean | TsResolverOptions
      webpack?: WebpackResolverOptions
      [resolve: string]: unknown
    }

export type ImportSettings = {
  cache?: {
    lifetime?: number | '∞' | 'Infinity'
  }
  coreModules?: string[]
  docstyle?: DocStyle[]
  extensions?: readonly FileExtension[]
  externalModuleFolders?: string[]
  ignore?: string[]
  internalRegex?: string
  parsers?: Record<string, readonly FileExtension[]>
  resolve?: NodeResolverOptions
  resolver?: Arrayable<ImportResolver>
}

export type WithPluginName<T extends string | object> = T extends string
  ? `${PluginName}/${KebabCase<T>}`
  : {
      [K in keyof T as WithPluginName<`${KebabCase<K & string>}`>]: T[K]
    }

export type PluginSettings = WithPluginName<ImportSettings>

export type PluginConfig = {
  plugins?: [PluginName]
  settings?: PluginSettings
  rules?: Record<`${PluginName}/${string}`, TSESLint.Linter.RuleEntry>
} & TSESLint.Linter.Config

export type RuleContext<
  TMessageIds extends string = string,
  TOptions extends readonly unknown[] = readonly unknown[],
> = {
  languageOptions?: {
    parser?: TSESLint.Linter.ParserModule
    parserOptions?: TSESLint.ParserOptions
  }
  settings: PluginSettings
} & Omit<TSESLint.RuleContext<TMessageIds, TOptions>, 'settings'>

export type ChildContext = {
  cacheKey: string
  settings: PluginSettings
  parserPath?: string | null
  parserOptions?: TSESLint.ParserOptions
  path: string
  filename?: string
}

export type ParseError = {
  lineNumber: number
  column: number
} & Error

// eslint-disable-next-line @typescript-eslint/ban-types
export type CustomESTreeNode<Type extends string, T extends object = {}> = Omit<
  TSESTree.BaseNode,
  'type'
> & {
  type: Type
} & T

export type ExportDefaultSpecifier = CustomESTreeNode<'ExportDefaultSpecifier'>

export type ExportNamespaceSpecifier = CustomESTreeNode<
  'ExportNamespaceSpecifier',
  { exported: TSESTree.Identifier }
>

export type PathGroup = {
  pattern: string
  group: ImportType
  patternOptions?: MinimatchOptions
  position?: 'before' | 'after'
}

export type AlphabetizeOptions = {
  caseInsensitive: boolean
  order: 'ignore' | 'asc' | 'desc'
  orderImportKind: 'ignore' | 'asc' | 'desc'
}
