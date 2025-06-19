import { isBuiltin } from 'node:module'
import path from 'node:path'

import { ResolverFactory } from 'unrs-resolver'
import type { NapiResolveOptions } from 'unrs-resolver'

import type { NewResolver } from './types.js'

export function createNodeResolver({
  extensions = ['.mjs', '.cjs', '.js', '.json', '.node'],
  conditionNames = ['import', 'require', 'default'],
  mainFields = ['module', 'main'],
  ...restOptions
}: NapiResolveOptions = {}): NewResolver {
  const resolver = new ResolverFactory({
    extensions,
    conditionNames,
    mainFields,
    ...restOptions,
  })

  // shared context across all resolve calls

  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x:node',
    resolve(modulePath, sourceFile) {
      if (isBuiltin(modulePath) || modulePath.startsWith('data:')) {
        return { found: true, path: null }
      }

      try {
        const resolved = resolver.sync(path.dirname(sourceFile), modulePath)
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
