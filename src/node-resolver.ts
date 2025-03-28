import module from 'node:module'
import path from 'node:path'

import { ResolverFactory } from 'unrs-resolver'
import type { NapiResolveOptions as ResolveOptions } from 'unrs-resolver'

import type { NewResolver } from './types'

export type NodeResolverOptions = {
  /**
   * Attempt to resolve these extensions in order.
   * If multiple files share the same name but have different extensions,
   * will resolve the one with the extension listed first in the array and skip the rest.
   *
   * @default ['.mjs', '.cjs', '.js', '.json', '.node']
   */
  extensions?: string[]
  /**
   * Condition names for exports field which defines entry points of a package.
   * The key order in the exports field is significant. During condition matching, earlier entries have higher priority and take precedence over later entries.
   *
   * @default ['import', 'require', 'default']
   */
  conditionNames?: string[]
  /**
   * A list of main fields in description files
   *
   * @default ['module', 'main']
   */
  mainFields?: string[]
} & ResolveOptions

export function createNodeResolver({
  extensions = ['.mjs', '.cjs', '.js', '.json', '.node'],
  conditionNames = ['import', 'require', 'default'],
  mainFields = ['module', 'main'],
  ...restOptions
}: NodeResolverOptions = {}): NewResolver {
  const resolver = new ResolverFactory({
    extensions,
    conditionNames,
    mainFields,
    ...restOptions,
  })

  // shared context across all resolve calls

  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x built-in node resolver',
    resolve(modulePath, sourceFile) {
      if (module.isBuiltin(modulePath)) {
        return { found: true, path: null }
      }

      /**
       * {@link https://github.com/webpack/enhanced-resolve/blob/38e9fd9acb79643a70e7bcd0d85dabc600ea321f/lib/PnpPlugin.js#L81-L83}
       */
      if (process.versions.pnp && modulePath === 'pnpapi') {
        return {
          found: true,
          path: module
            .findPnpApi(sourceFile)
            .resolveToUnqualified(modulePath, sourceFile, {
              considerBuiltins: false,
            }),
        }
      }

      if (modulePath.startsWith('data:')) {
        return { found: true, path: null }
      }

      try {
        const resolved = resolver.sync(path.dirname(sourceFile), modulePath)
        if (resolved.path) {
          return { found: true, path: resolved.path }
        }
        return { found: false }
      } catch {
        return { found: false }
      }
    },
  }
}
