// Although the new import resolver settings is still `import-x/resolver-next`, but it won't stop us from calling existing ones legacy~

import type { LiteralUnion } from "type-fest"

import { createRequire } from 'node:module'
import type { NodeResolverOptions, ResolvedResult, TsResolverOptions, WebpackResolverOptions } from "../types"
import path from "path"
import { IMPORT_RESOLVE_ERROR_NAME } from "./resolve"
import { pkgDir } from './pkg-dir'

export type LegacyResolverName = LiteralUnion<
  'node' | 'typescript' | 'webpack',
  string
>

export type LegacyResolverResolveImport<T = unknown> = (
  modulePath: string,
  sourceFile: string,
  config: T,
) => string | undefined

export type LegacyResolverResolve<T = unknown> = (
  modulePath: string,
  sourceFile: string,
  config: T,
) => ResolvedResult

export type LegacyResolver<T = unknown, U = T> = {
  interfaceVersion?: 1 | 2
  resolve: LegacyResolverResolve<T>
  resolveImport: LegacyResolverResolveImport<U>
}

export type LegacyResolverObject = {
  // node, typescript, webpack...
  name: LegacyResolverName

  // Enabled by default
  enable?: boolean

  // Options passed to the resolver
  options?:
  | NodeResolverOptions
  | TsResolverOptions
  | WebpackResolverOptions
  | unknown

  // Any object satisfied Resolver type
  resolver: LegacyResolver
}

export type LegacyResolverRecord = {
  node?: boolean | NodeResolverOptions
  typescript?: boolean | TsResolverOptions
  webpack?: WebpackResolverOptions
  [resolve: string]: unknown
}

export type LegacyImportResolver =
  | LegacyResolverName
  | LegacyResolverRecord
  | LegacyResolverObject
  | LegacyResolverName[]
  | LegacyResolverRecord[]
  | LegacyResolverObject[];

export function normalizeConfigResolvers(
  resolvers: LegacyImportResolver,
  sourceFile: string,
) {
  const resolverArray = Array.isArray(resolvers) ? resolvers : [resolvers]
  const map = new Map<string, Required<LegacyResolverObject>>()

  for (const nameOrRecordOrObject of resolverArray) {
    if (typeof nameOrRecordOrObject === 'string') {
      const name = nameOrRecordOrObject

      map.set(name, {
        name,
        enable: true,
        options: undefined,
        resolver: requireResolver(name, sourceFile),
      })
    } else if (typeof nameOrRecordOrObject === 'object') {
      if (nameOrRecordOrObject.name && nameOrRecordOrObject.resolver) {
        const object = nameOrRecordOrObject as LegacyResolverObject

        const { name, enable = true, options, resolver } = object
        map.set(name, { name, enable, options, resolver })
      } else {
        const record = nameOrRecordOrObject as LegacyResolverRecord

        for (const [name, enableOrOptions] of Object.entries(record)) {
          if (typeof enableOrOptions === 'boolean') {
            map.set(name, {
              name,
              enable: enableOrOptions,
              options: undefined,
              resolver: requireResolver(name, sourceFile),
            })
          } else {
            map.set(name, {
              name,
              enable: true,
              options: enableOrOptions,
              resolver: requireResolver(name, sourceFile),
            })
          }
        }
      }
    } else {
      const err = new Error('invalid resolver config')
      err.name = IMPORT_RESOLVE_ERROR_NAME
      throw err
    }
  }

  return [...map.values()]
}

function requireResolver(name: string, sourceFile: string) {
  // Try to resolve package with conventional name
  const resolver =
    tryRequire(`eslint-import-resolver-${name}`, sourceFile) ||
    tryRequire(name, sourceFile) ||
    tryRequire(path.resolve(getBaseDir(sourceFile), name))

  if (!resolver) {
    const err = new Error(`unable to load resolver "${name}".`)
    err.name = IMPORT_RESOLVE_ERROR_NAME
    throw err
  }
  if (!isLegacyResolverValid(resolver)) {
    const err = new Error(`${name} with invalid interface loaded as resolver`)
    err.name = IMPORT_RESOLVE_ERROR_NAME
    throw err
  }

  return resolver
}

function isLegacyResolverValid(resolver: object): resolver is LegacyResolver {
  if ('interfaceVersion' in resolver && resolver.interfaceVersion === 2) {
    return (
      'resolve' in resolver &&
      !!resolver.resolve &&
      typeof resolver.resolve === 'function'
    )
  }
  return (
    'resolveImport' in resolver &&
    !!resolver.resolveImport &&
    typeof resolver.resolveImport === 'function'
  )
}

function tryRequire<T>(
  target: string,
  sourceFile?: string | null,
): undefined | T {
  let resolved
  try {
    // Check if the target exists
    if (sourceFile == null) {
      resolved = require.resolve(target)
    } else {
      try {
        resolved = createRequire(path.resolve(sourceFile)).resolve(target)
      } catch {
        resolved = require.resolve(target)
      }
    }
  } catch {
    // If the target does not exist then just return undefined
    return undefined
  }

  // If the target exists then return the loaded module
  return require(resolved)
}


function getBaseDir(sourceFile: string): string {
  return pkgDir(sourceFile) || process.cwd()
}
