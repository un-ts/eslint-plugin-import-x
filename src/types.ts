import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { ResolveOptions } from 'enhanced-resolve'
import type { MinimatchOptions } from 'minimatch'
import type { KebabCase } from 'type-fest'

import type { ImportType as ImportType_, PluginName } from './utils'
import type { LegacyImportResolver, LegacyResolver } from './utils/legacy-resolver-settings'

export type {
  LegacyResolver,

  LegacyResolverName,
  LegacyResolverName as ResolverName,

  LegacyImportResolver,
  LegacyImportResolver as ImportResolver,

  LegacyResolverResolve,
  LegacyResolverResolve as ResolverResolve,

  LegacyResolverResolveImport,
  LegacyResolverResolveImport as ResolverResolveImport,

  LegacyResolverRecord,
  LegacyResolverRecord as ResolverRecord,

  LegacyResolverObject,
  LegacyResolverObject as ResolverObject,
} from './utils/legacy-resolver-settings'

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

export type TsResolverOptions = {
  alwaysTryTypes?: boolean
  project?: string[] | string
  extensions?: string[]
} & Omit<ResolveOptions, 'fileSystem' | 'useSyncFileSystemCalls'>

// TODO: remove prefix New in the next major version
export type NewResolverResolve = (
  modulePath: string,
  sourceFile: string,
) => ResolvedResult

// TODO: remove prefix New in the next major version
export type NewResolver = {
  interfaceVersion: 3,
  /** optional name for the resolver, this is used in logs/debug output */
  name?: string,
  resolve: NewResolverResolve,
}

export type FileExtension = `.${string}`

export type DocStyle = 'jsdoc' | 'tomdoc'

export type Arrayable<T> = T | readonly T[]

export type ResultNotFound = {
  found: false
  path?: undefined
}

export type ResultFound = {
  found: true
  path: string | null
}

export type Resolver = LegacyResolver | NewResolver

export type ResolvedResult = ResultNotFound | ResultFound

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
  resolver?: LegacyImportResolver
  'resolver-next'?: NewResolver[]
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
} & TSESLint.Linter.ConfigType

export type PluginFlatBaseConfig = {
  settings?: PluginSettings
  rules?: Record<`${PluginName}/${string}`, TSESLint.FlatConfig.RuleEntry>
} & TSESLint.FlatConfig.Config

export type PluginFlatConfig = PluginFlatBaseConfig & {
  name?: `${PluginName}/${string}`
}

export type RuleContext<
  TMessageIds extends string = string,
  TOptions extends readonly unknown[] = readonly unknown[],
> = Readonly<{
  languageOptions?: TSESLint.FlatConfig.LanguageOptions
  settings: PluginSettings
}> &
  Omit<TSESLint.RuleContext<TMessageIds, TOptions>, 'settings'>

export type ChildContext = {
  cacheKey: string
  settings: PluginSettings
  parserPath?: string | null
  parserOptions?: TSESLint.ParserOptions
  languageOptions?: TSESLint.FlatConfig.LanguageOptions
  path: string
  filename?: string
}

export type ParseError = {
  lineNumber: number
  column: number
} & Error

export type CustomESTreeNode<
  Type extends string,
  T extends object = object,
> = Omit<TSESTree.BaseNode, 'type'> & {
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
