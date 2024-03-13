import type { TsResolverOptions } from 'eslint-import-resolver-typescript'
import type { KebabCase, LiteralUnion } from 'type-fest'
import type { ResolveOptions } from 'enhanced-resolve'

import type { PluginName } from './utils'
import { TSESLint } from '@typescript-eslint/utils'

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

export interface ImportSettings {
  cache?: {
    lifetime: number | '∞' | 'Infinity'
  }
  coreModules?: string[]
  extensions?: ReadonlyArray<`.${string}`>
  externalModuleFolders?: string[]
  parsers?: boolean | Record<string, string[]>
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
