import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import type { MinimatchOptions } from 'minimatch'
import type { KebabCase } from 'type-fest'
import type { NapiResolveOptions as ResolveOptions } from 'unrs-resolver'

import type {
  ImportType as ImportType_,
  LegacyImportResolver,
  LegacyResolver,
  PluginName,
} from './utils/index.js'

export type {
  LegacyResolver,
  // ResolverName
  LegacyResolverName,
  LegacyResolverName as ResolverName,
  // ImportResolver
  LegacyImportResolver,
  LegacyImportResolver as ImportResolver,
  // ResolverResolve
  LegacyResolverResolve,
  LegacyResolverResolve as ResolverResolve,
  // ResolverResolveImport
  LegacyResolverResolveImport,
  LegacyResolverResolveImport as ResolverResolveImport,
  // ResolverRecord
  LegacyResolverRecord,
  LegacyResolverRecord as ResolverRecord,
  // ResolverObject
  LegacyResolverObject,
  LegacyResolverObject as ResolverObject,
} from './utils/index.js'

export type ImportType = ImportType_ | 'object' | 'type'

export interface LegacyNodeResolverOptions {
  extensions?: readonly string[]
  /** set to `false` to exclude node core modules (e.g.` fs`) from the search */
  includeCoreModules?: boolean
  /** directory (or directories) in which to recursively look for modules. Default "node_modules" */
  moduleDirectory?: string
  /** if true, doesn't resolve basedir to real path before resolving. This is the way Node resolves dependencies when executed with the --preserve-symlinks flag. Default to true */
  preserveSymlinks?: boolean
  /** Noop now, Previously a directory to begin resolving from */
  basedir?: string
  /** Noop now. Previously for require.paths array to */
  paths?: string[]

  /** Noop now. Previously for how to read files asynchronously */
  readFile?: never
  /** Noop now. Previously a function to asynchronously test whether a file exists */
  isFile?: never
  /** Noop now. Previously a function to asynchronously whether a file exists and is a directory */
  isDirectory?: never
  /** Noop now. Previously a function to asynchronously resolve a potential symlink to its real path */
  realpath?: never
  /** Noop now. Previously a function to asynchronously read a package.json file */
  readPackage?: never
  /** Noop now. Previously a function to transform the parsed package.json contents before looking at the "main" field */
  packageFilter?: never
  /** Noop now. Previously a function to transform the resolved path before returning it */
  pathFilter?: never
}

export interface WebpackResolverOptions {
  config?: string | { resolve: ResolveOptions }
  'config-index'?: number
  env?: Record<string, unknown>
  argv?: Record<string, unknown>
}

export interface TsResolverOptions extends ResolveOptions {
  alwaysTryTypes?: boolean
  project?: string[] | string
  extensions?: string[]
}

// TODO: remove prefix New in the next major version
export type NewResolverResolve = (
  modulePath: string,
  sourceFile: string,
) => ResolvedResult

// TODO: remove prefix New in the next major version
export interface NewResolver {
  interfaceVersion: 3
  /** optional name for the resolver, this is used in logs/debug output */
  name?: string
  resolve: NewResolverResolve
}

export type FileExtension = `.${string}`

export type DocStyle = 'jsdoc' | 'tomdoc'

export type Arrayable<T> = T | readonly T[]

export interface ResultNotFound {
  found: false
  path?: undefined
}

export interface ResultFound {
  found: true
  path: string | null
}

export type Resolver = LegacyResolver | NewResolver

export type ResolvedResult = ResultNotFound | ResultFound

export interface ImportSettings {
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
  resolve?: LegacyNodeResolverOptions
  resolver?: LegacyImportResolver
  'resolver-legacy'?: LegacyImportResolver
  'resolver-next'?: NewResolver[]
}

export type WithPluginName<T extends string | object> = T extends string
  ? `${PluginName}/${KebabCase<T>}`
  : {
      [K in keyof T as WithPluginName<`${KebabCase<K & string>}`>]: T[K]
    }

export type PluginSettings = WithPluginName<ImportSettings>

export interface PluginConfig extends TSESLint.ClassicConfig.Config {
  plugins?: [PluginName]
  settings?: PluginSettings
  rules?: Record<`${PluginName}/${string}`, TSESLint.ClassicConfig.RuleEntry>
}

export interface PluginFlatBaseConfig extends TSESLint.FlatConfig.Config {
  settings?: PluginSettings
  rules?: Record<`${PluginName}/${string}`, TSESLint.FlatConfig.RuleEntry>
}

export interface PluginFlatConfig extends PluginFlatBaseConfig {
  name?: `${PluginName}/${string}`
}

export interface RuleContext<
  TMessageIds extends string = string,
  TOptions extends readonly unknown[] = readonly unknown[],
> extends Omit<TSESLint.RuleContext<TMessageIds, TOptions>, 'settings'> {
  settings: PluginSettings
}

export interface ChildContext {
  cacheKey: string
  settings: PluginSettings
  parserPath?: string | null
  parserOptions?: TSESLint.ParserOptions
  languageOptions?: TSESLint.FlatConfig.LanguageOptions
  path: string
  filename?: string
}

export interface ParseError extends Error {
  lineNumber: number
  column: number
}

export interface CustomESTreeNode<Type extends string>
  extends Omit<TSESTree.BaseNode, 'type'> {
  type: Type
}

export type ExportDefaultSpecifier = CustomESTreeNode<'ExportDefaultSpecifier'>

export interface ExportNamespaceSpecifier
  extends CustomESTreeNode<'ExportNamespaceSpecifier'> {
  exported: TSESTree.Identifier
}

export interface PathGroup {
  pattern: string
  group: ImportType
  patternOptions?: MinimatchOptions
  position?: 'before' | 'after'
}

export type ExportAndImportKind = 'value' | 'type'

export type NewLinesOptions =
  | 'always'
  | 'always-and-inside-groups'
  | 'ignore'
  | 'never'

export type NamedTypes = 'mixed' | 'types-first' | 'types-last'

export interface NamedOptions {
  enabled?: boolean
  import?: boolean
  export?: boolean
  require?: boolean
  cjsExports?: boolean
  types?: NamedTypes
}

export interface AlphabetizeOptions {
  caseInsensitive: boolean
  order: 'ignore' | 'asc' | 'desc'
  orderImportKind: 'ignore' | 'asc' | 'desc'
}

export type ImportEntryType = 'import:object' | 'import' | 'require' | 'export'

export type LiteralNodeValue =
  | string
  | number
  | bigint
  | boolean
  | RegExp
  | null

export interface ImportEntry {
  type: ImportEntryType
  node: TSESTree.Node & {
    importKind?: ExportAndImportKind
    exportKind?: ExportAndImportKind
  }
  value: LiteralNodeValue
  alias?: string
  kind?: ExportAndImportKind
  displayName?: LiteralNodeValue
}

export interface ImportEntryWithRank extends ImportEntry {
  rank: number
  isMultiline?: boolean
}

export interface RanksPathGroup {
  pattern: string
  patternOptions?: MinimatchOptions
  group: string
  position?: number
}

export type RanksGroups = Record<string, number>

export interface Ranks {
  omittedTypes: string[]
  groups: RanksGroups
  pathGroups: RanksPathGroup[]
  maxPosition: number
}
