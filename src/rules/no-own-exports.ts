import path from 'node:path'

import { minimatch } from 'minimatch'

import type { PackageJson, RuleContext } from '../types.js'
import {
  createRule,
  getFilePackageName,
  isTypeOnlyImportOrExport,
  moduleVisitor,
  readPkgUp,
  resolve,
} from '../utils/index.js'

export interface Options {
  allowInFiles?: string[]
  ignoreTypeImports?: boolean
}

export type MessageId = 'ownExports'

function isFileAllowed(allowInFiles: string[], context: RuleContext) {
  const filename = context.physicalFilename
  return allowInFiles.some(
    glob =>
      minimatch(filename, glob) ||
      minimatch(filename, path.resolve(context.cwd, glob), {
        windowsPathsNoEscape: true,
      }) ||
      minimatch(filename, path.resolve(glob), { windowsPathsNoEscape: true }),
  )
}

// Whether a target, possibly nested in conditions or fallback arrays, maps to
// a file under at least one set of conditions; `null` excludes the subpath.
function hasExportTarget(target: unknown): boolean {
  if (typeof target === 'string') {
    return true
  }
  if (Array.isArray(target)) {
    return target.some(hasExportTarget)
  }
  return (
    target != null &&
    typeof target === 'object' &&
    Object.values(target).some(hasExportTarget)
  )
}

/**
 * Whether `exports` exposes `subpath` (`.` or `./name`), following the key
 * matching of Node.js `PACKAGE_EXPORTS_RESOLVE`: an exact key first, then the
 * most specific `*` pattern key. Conditions are not evaluated.
 */
function isExported(
  exports: NonNullable<PackageJson['exports']>,
  subpath: string,
) {
  const exportsMap: Record<string, unknown> =
    typeof exports === 'string' ||
    Array.isArray(exports) ||
    !Object.keys(exports).some(key => key.startsWith('.'))
      ? { '.': exports }
      : exports

  if (!subpath.includes('*') && Object.hasOwn(exportsMap, subpath)) {
    return hasExportTarget(exportsMap[subpath])
  }

  let bestKey: string | undefined
  for (const key of Object.keys(exportsMap)) {
    const starIndex = key.indexOf('*')
    if (starIndex === -1 || starIndex !== key.lastIndexOf('*')) {
      continue
    }
    const patternBase = key.slice(0, starIndex)
    const patternTrailer = key.slice(starIndex + 1)
    if (
      subpath.startsWith(patternBase) &&
      subpath !== patternBase &&
      (!patternTrailer ||
        (subpath.endsWith(patternTrailer) && subpath.length >= key.length)) &&
      (!bestKey ||
        patternBase.length > bestKey.indexOf('*') ||
        (patternBase.length === bestKey.indexOf('*') &&
          key.length > bestKey.length))
    ) {
      bestKey = key
    }
  }

  return bestKey != null && hasExportTarget(exportsMap[bestKey])
}

export default createRule<[Options?], MessageId>({
  name: 'no-own-exports',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description:
        'Forbid a package from importing itself through its own `exports` map.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInFiles: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
          },
          ignoreTypeImports: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      ownExports:
        "'{{importPath}}' imports '{{packageName}}' through its own exports. Use a relative import instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const { allowInFiles, ignoreTypeImports } = context.options[0] || {}

    if (allowInFiles?.length && isFileAllowed(allowInFiles, context)) {
      return {}
    }

    // Node.js resolves a package self-reference through the `exports` field of
    // the package.json closest to the importing file.
    const { pkg } = readPkgUp({ cwd: context.physicalFilename })
    const packageName = pkg?.name
    const exports = pkg?.exports

    if (!packageName || exports == null) {
      return {}
    }

    return moduleVisitor(
      (source, node) => {
        const importPath = source.value

        if (
          importPath !== packageName &&
          !importPath.startsWith(`${packageName}/`)
        ) {
          return
        }

        // Node.js only resolves a self-reference to a path `exports` exposes
        const subpath = `.${importPath.slice(packageName.length)}`
        if (!isExported(exports, subpath)) {
          return
        }

        if (ignoreTypeImports && isTypeOnlyImportOrExport(node)) {
          return
        }

        // A resolver alias can point the package's own name elsewhere, and a
        // built-in module (`null`) takes precedence over a self-reference
        const resolved = resolve(importPath, context)
        if (resolved === null) {
          return
        }
        if (resolved) {
          const realPackageName = getFilePackageName(resolved)
          if (realPackageName && realPackageName !== packageName) {
            return
          }
        }

        context.report({
          node: source,
          messageId: 'ownExports',
          data: { importPath, packageName },
        })
      },
      { commonjs: true },
    )
  },
})
