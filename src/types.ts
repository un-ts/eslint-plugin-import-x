import type { Linter } from 'eslint'
import type { TsResolverOptions } from 'eslint-import-resolver-typescript'
import type { KebabCase, LiteralUnion } from 'type-fest'
import type { ResolveOptions } from 'enhanced-resolve'

import type { PluginName } from './utils'

export interface NodeResolverOptions {
  extensions?: string[]
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
  coreModules?: string[]
  extensions?: string[]
  externalModuleFolders?: string[]
  parsers?: Record<string, string[]>
  resolver?:
    | LiteralUnion<'node' | 'typescript' | 'webpack', string>
    | {
        node?: boolean | NodeResolverOptions
        typescript?: boolean | TsResolverOptions
        webpack?: WebpackResolverOptions
      }
}

export type WithPluginName<T extends object> = {
  [K in keyof T as `${PluginName}/${KebabCase<K & string>}`]: T[K]
}

export type PluginSettings = WithPluginName<ImportSettings>

export interface PluginConfig extends Linter.Config {
  plugins?: [PluginName]
  settings?: PluginSettings
  rules?: Record<`${PluginName}/${string}`, Linter.RuleEntry>
}
