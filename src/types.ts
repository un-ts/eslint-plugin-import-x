import type { TsResolverOptions } from 'eslint-import-resolver-typescript'
import type { KebabCase, LiteralUnion } from 'type-fest'
import type { ResolveOptions } from 'enhanced-resolve'

import type { PluginName } from './utils'
import { TSESLint, TSESTree } from '@typescript-eslint/utils'

export interface NodeResolverOptions {
  extensions?: readonly string[]
  moduleDirectory?: string[]
  paths?: string[]
}

export interface WebpackResolverOptions {
  config?: string | ResolveOptions
  'config-index'?: number
  env?: Record<string, unknown>
  argv?: Record<string, unknown>
}

export type FileExtension = `.${string}`

export type DocStyle = 'jsdoc' | 'tomdoc'

export interface ImportSettings {
  cache?: {
    lifetime: number | '∞' | 'Infinity'
  }
  coreModules?: string[]
  docstyle?: DocStyle[]
  extensions?: readonly FileExtension[]
  externalModuleFolders?: string[]
  ignore?: string[]
  parsers?: Record<string, FileExtension[]>
  resolve?: NodeResolverOptions
  resolver?:
    | LiteralUnion<'node' | 'typescript' | 'webpack', string>
    | {
        node?: boolean | NodeResolverOptions
        typescript?: boolean | TsResolverOptions
        webpack?: WebpackResolverOptions
      }
}

export type WithPluginName<T extends string | object> = T extends string
  ? `${PluginName}/${KebabCase<T>}`
  : {
      [K in keyof T as WithPluginName<`${KebabCase<K & string>}`>]: T[K]
    }

export type PluginSettings = WithPluginName<ImportSettings>

export interface PluginConfig extends TSESLint.Linter.Config {
  plugins?: [PluginName]
  settings?: PluginSettings
  rules?: Record<`${PluginName}/${string}`, TSESLint.Linter.RuleEntry>
}

export interface RuleContext<
  TMessageIds extends string = string,
  TOptions extends readonly unknown[] = readonly unknown[],
> extends Omit<TSESLint.RuleContext<TMessageIds, TOptions>, 'settings'> {
  languageOptions?: {
    parser: TSESLint.Linter.ParserModule
    parserOptions: TSESLint.ParserOptions
  }
  settings: PluginSettings
}

export interface ChildContext {
  cacheKey: string
  settings: PluginSettings
  parserPath: string
  parserOptions: TSESLint.ParserOptions
  path: string
  filename: string
}

export interface ParseError extends Error {
  lineNumber: number
  column: number
}

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
