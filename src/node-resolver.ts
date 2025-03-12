import fs from 'node:fs'
import { isBuiltin } from 'node:module'
import path from 'node:path'

import { ResolverFactory, CachedInputFileSystem } from 'enhanced-resolve'
import type { ResolveOptions } from 'enhanced-resolve'

import type { NewResolver } from './types'

type NodeResolverOptions = {
  /**
   * The allowed extensions the resolver will attempt to find when resolving a module
   * @type {string[] | undefined}
   * @default ['.mjs', '.cjs', '.js', '.json', '.node']
   */
  extensions?: string[]
  /**
   * The import conditions the resolver will used when reading the exports map from "package.json"
   * @type {string[] | undefined}
   * @default ['default', 'module', 'import', 'require']
   */
  conditionNames?: string[]
} & Omit<ResolveOptions, 'useSyncFileSystemCalls'>

export function createNodeResolver({
  extensions = ['.mjs', '.cjs', '.js', '.json', '.node'],
  conditionNames = ['import', 'require', 'default'],
  mainFields: _mainFields = ['main'],
  exportsFields: _exportsFields = ['exports'],
  mainFiles: _mainFiles = ['index'],
  fileSystem = new CachedInputFileSystem(fs, 4 * 1000),
  ...restOptions
}: Partial<NodeResolverOptions> = {}): NewResolver {
  const resolver = ResolverFactory.createResolver({
    extensions,
    fileSystem,
    conditionNames,
    useSyncFileSystemCalls: true,
    ...restOptions,
  })

  // shared context across all resolve calls

  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x built-in node resolver',
    resolve: (modulePath, sourceFile) => {
      if (isBuiltin(modulePath)) {
        return { found: true, path: null }
      }

      if (modulePath.startsWith('data:')) {
        return { found: true, path: null }
      }

      try {
        const resolved = resolver.resolveSync(
          {},
          path.dirname(sourceFile),
          modulePath,
        )
        if (resolved) {
          return { found: true, path: resolved }
        }
        return { found: false }
      } catch {
        return { found: false }
      }
    },
  }
}
