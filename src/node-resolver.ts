import { isBuiltin } from 'node:module'
import path from 'node:path'

import { ResolverFactory } from 'unrs-resolver'
import type { NapiResolveOptions } from 'unrs-resolver'

import type { NewResolver } from './types.js'

let resolver: ResolverFactory | undefined

// @internal
export function clearNodeResolverCache() {
  resolver?.clearCache()
}

export function createNodeResolver({
  extensions = ['.mjs', '.cjs', '.js', '.json', '.node'],
  conditionNames = ['import', 'require', 'default'],
  mainFields = ['module', 'main'],
  ...restOptions
}: NapiResolveOptions = {}): NewResolver {
  const options = {
    extensions,
    conditionNames,
    mainFields,
    ...restOptions,
  }

  resolver = resolver
    ? resolver.cloneWithOptions(options)
    : new ResolverFactory(options)

  // shared context across all resolve calls

  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x:node',
    resolve(modulePath, sourceFile) {
      if (isBuiltin(modulePath) || modulePath.startsWith('data:')) {
        return { found: true, path: null }
      }

      try {
        const resolved = resolver!.sync(path.dirname(sourceFile), modulePath)
        if (resolved.path) {
          return { found: true, path: resolved.path }
        }
      } catch {
        //
      }
      return { found: false }
    },
  }
}
