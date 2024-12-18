import { ResolverFactory, CachedInputFileSystem } from 'enhanced-resolve';
import fs from 'node:fs';
import type { NewResolver } from './types';
import { isBuiltin } from 'node:module';
import { dirname } from 'node:path';

interface NodeResolverOptions {
  /**
   * The allowed extensions the resolver will attempt to find when resolving a module
   * @type {string[] | undefined}
   * @default ['.mjs', '.cjs', '.js', '.json', '.node']
   */
  extensions?: string[];
  /**
   * The import conditions the resolver will used when reading the exports map from "package.json"
   * @type {Set<string> | undefined}
   * @default new Set(['default', 'module', 'import', 'require'])
   */
  conditions?: Set<string>;
  /**
   * keep symlinks instead of resolving them
   * @type {boolean | undefined}
   * @default false
   */
  preserveSymlinks?: boolean;
}

export function createNodeResolver({
  extensions = ['.mjs', '.cjs', '.js', '.json', '.node'],
  conditions = new Set(['default', 'module', 'import', 'require']),
  preserveSymlinks = false,
}: NodeResolverOptions = {}): NewResolver {
  const resolver = ResolverFactory.createResolver({
    fileSystem: new CachedInputFileSystem(fs, 4 * 1000),
    extensions,
    conditionNames: Array.from(conditions),
    symlinks: !preserveSymlinks,
    useSyncFileSystemCalls: true
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
