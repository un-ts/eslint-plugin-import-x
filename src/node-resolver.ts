import { ResolverFactory, CachedInputFileSystem, type ResolveOptions } from 'enhanced-resolve';
import fs from 'node:fs';
import type { NewResolver } from './types';
import { isBuiltin } from 'node:module';
import { dirname } from 'node:path';

interface NodeResolverOptions extends Omit<ResolveOptions, 'useSyncFileSystemCalls'> {
  /**
   * The allowed extensions the resolver will attempt to find when resolving a module
   * @type {string[] | undefined}
   * @default ['.mjs', '.cjs', '.js', '.json', '.node']
   */
  extensions?: string[];
  /**
   * The import conditions the resolver will used when reading the exports map from "package.json"
   * @type {string[] | undefined}
   * @default ['default', 'module', 'import', 'require']
   */
  conditionNames?: string[];
}

export function createNodeResolver({
  extensions = ['.mjs', '.cjs', '.js', '.json', '.node'],
  conditionNames = ['default', 'module', 'import', 'require'],
  mainFields = ['main'],
  exportsFields = ['exports'],
  mainFiles = ['index'],
  fileSystem = new CachedInputFileSystem(fs, 4 * 1000),
  ...restOptions
}: Partial<NodeResolverOptions> = {}): NewResolver {
  const resolver = ResolverFactory.createResolver({
    extensions,
    fileSystem,
    conditionNames,
    useSyncFileSystemCalls: true,
    ...restOptions,
  });

  // shared context across all resolve calls

  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x built-in node resolver',
    resolve: (modulePath, sourceFile) => {
      if (isBuiltin(modulePath)) {
        return { found: true, path: null };
      }

      if (modulePath.startsWith('data:')) {
        return { found: true, path: null };
      }

      try {
        const path = resolver.resolveSync(
          {},
          dirname(sourceFile),
          modulePath
        );
        if (path) {
          return { found: true, path };
        }
        return { found: false };
      } catch {
        return { found: false };
      }
    }
  }
}
