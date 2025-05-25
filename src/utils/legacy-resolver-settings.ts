// Although the new import resolver settings is still `import-x/resolver-next`, but it won't stop us from calling existing ones legacy~

import { createRequire } from 'node:module'
import path from 'node:path'

import type {
  LegacyImportResolver,
  LegacyResolver,
  LegacyResolverObject,
  LegacyResolverRecord,
  ResolvedResult,
} from 'eslint-import-context'

import { cjsRequire } from '../require.js'

import { pkgDir } from './pkg-dir.js'
import { IMPORT_RESOLVE_ERROR_NAME } from './resolve.js'

export function resolveWithLegacyResolver(
  resolver: LegacyResolver,
  config: unknown,
  modulePath: string,
  sourceFile: string,
): ResolvedResult {
  if (resolver.interfaceVersion === 2) {
    return resolver.resolve(modulePath, sourceFile, config)
  }

  try {
    const resolved = resolver.resolveImport(modulePath, sourceFile, config)
    if (resolved === undefined) {
      return {
        found: false,
      }
    }
    return {
      found: true,
      path: resolved,
    }
  } catch {
    return {
      found: false,
    }
  }
}

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
      resolved = cjsRequire.resolve(target)
    } else {
      try {
        resolved = createRequire(path.resolve(sourceFile)).resolve(target)
      } catch {
        resolved = cjsRequire.resolve(target)
      }
    }
  } catch {
    // If the target does not exist then just return undefined
    return undefined
  }

  // If the target exists then return the loaded module
  return cjsRequire(resolved)
}

function getBaseDir(sourceFile: string): string {
  return pkgDir(sourceFile) || process.cwd()
}
