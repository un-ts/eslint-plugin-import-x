import { fileURLToPath, pathToFileURL } from "url";
import type { NewResolver } from "./types";

import type { ErrnoException } from '@dual-bundle/import-meta-resolve' with { "resolution-mode": "import" };

const importMetaResolveExports: typeof import('@dual-bundle/import-meta-resolve', { with: { "resolution-mode": "import" } }) = require('@dual-bundle/import-meta-resolve');
const { moduleResolve } = importMetaResolveExports;

interface NodeResolverOptions {
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

const assertErrNoException = (error: unknown): error is ErrnoException => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  );
}

export function createNodeResolver({
  conditions = new Set(['default', 'module', 'import', 'require']),
  preserveSymlinks = false,
}: NodeResolverOptions = {}): NewResolver {
  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x built-in node resolver',
    resolve: (modulePath, sourceFile) => {
      try {
        const found = moduleResolve(
          modulePath,
          pathToFileURL(sourceFile),
          conditions,
          preserveSymlinks
        );
        return {
          found: true,
          path: fileURLToPath(found),
        };
      } catch (error) {
        if (assertErrNoException(error) && error.code === 'ERR_MODULE_NOT_FOUND') {
          return {
            found: false,
          }
        }
        throw error;
      }
    }
  }
}
