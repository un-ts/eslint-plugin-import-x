import type { NewResolver } from "./types";

import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import { createRequire } from "module";

import type { ErrnoException, moduleResolve as $moduleResolve } from '@dual-bundle/import-meta-resolve' with { "resolution-mode": "import" };
const importMetaResolveExports = require('@dual-bundle/import-meta-resolve');
const moduleResolve = importMetaResolveExports.moduleResolve as typeof $moduleResolve;

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

        if (found.protocol === 'file:') {
          if (fs.existsSync(found)) {
            return {
              found: true,
              path: fileURLToPath(found),
            };
          }
        } else if (found.protocol === 'node:' || found.protocol === 'data:') {
          return {
            found: true,
            path: null
          }
        }
        return {
          found: false
        }
      } catch (error) {
        if (assertErrNoException(error)) {
          if (error.code === 'ERR_MODULE_NOT_FOUND') {
            return {
              found: false,
            }
          }
          if (error.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
            const $require = createRequire(sourceFile);
            try {
              const resolved = $require.resolve(modulePath);
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
        }
        return {
          found: false,
        }
      }
    }
  }
}
