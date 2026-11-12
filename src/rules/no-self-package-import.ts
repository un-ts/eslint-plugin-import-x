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

export type MessageId = 'selfPackageImport'

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

const INVALID_SEGMENTS = new Set(['.', '..', 'node_modules'])

// Whether a target or `*` substitution has a segment Node.js rejects: `.`,
// `..` or `node_modules`, in any case and percent-encoded or not, with both
// `/` and `\` as separators.
function hasInvalidSegment(value: string) {
  return value.split(/[/\\]/).some(segment => {
    let decoded = segment
    try {
      decoded = decodeURIComponent(segment)
    } catch {
      // a malformed escape is not one of the invalid segments
    }
    return INVALID_SEGMENTS.has(decoded.toLowerCase())
  })
}

// Whether a target, possibly nested in conditions or fallback arrays, maps to
// a file under at least one set of conditions; `null` excludes the subpath.
// A string target must start with `./`, stay inside the package and not end in
// `/`: a directory target cannot be loaded (`ERR_UNSUPPORTED_DIR_IMPORT`).
function hasExportTarget(target: unknown): boolean {
  if (typeof target === 'string') {
    return (
      target.startsWith('./') &&
      !target.endsWith('/') &&
      !hasInvalidSegment(target.slice(2))
    )
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

// `exports` as a map keyed by subpath: a string, an array or an object of
// conditions is shorthand for `{ ".": exports }`. `undefined` when the object
// mixes subpath keys (starting with `.`) and condition keys, which Node.js
// rejects with `ERR_INVALID_PACKAGE_CONFIG`.
function toExportsMap(
  exports: NonNullable<PackageJson['exports']>,
): Record<string, unknown> | undefined {
  if (typeof exports === 'string' || Array.isArray(exports)) {
    return { '.': exports }
  }
  const keys = Object.keys(exports)
  const subpathKeyCount = keys.filter(key => key.startsWith('.')).length
  if (subpathKeyCount === 0) {
    return { '.': exports }
  }
  return subpathKeyCount === keys.length ? exports : undefined
}

// Whether `key`, a pattern key with a single `*`, matches `subpath`
function matchesPatternKey(key: string, subpath: string) {
  const starIndex = key.indexOf('*')
  if (starIndex === -1 || starIndex !== key.lastIndexOf('*')) {
    return false
  }
  const patternBase = key.slice(0, starIndex)
  const patternTrailer = key.slice(starIndex + 1)
  return (
    subpath.startsWith(patternBase) &&
    subpath !== patternBase &&
    (!patternTrailer ||
      (subpath.endsWith(patternTrailer) && subpath.length >= key.length))
  )
}

// Node.js `PATTERN_KEY_COMPARE`: the pattern key with the longer part before
// `*` is more specific, then the longer key
function isMoreSpecificPatternKey(key: string, otherKey: string) {
  const baseLength = key.indexOf('*')
  const otherBaseLength = otherKey.indexOf('*')
  return (
    baseLength > otherBaseLength ||
    (baseLength === otherBaseLength && key.length > otherKey.length)
  )
}

// The most specific `*` pattern key of `exportsMap` that matches `subpath`
function findPatternKey(exportsMap: Record<string, unknown>, subpath: string) {
  let bestKey: string | undefined
  for (const key of Object.keys(exportsMap)) {
    if (
      matchesPatternKey(key, subpath) &&
      (!bestKey || isMoreSpecificPatternKey(key, bestKey))
    ) {
      bestKey = key
    }
  }
  return bestKey
}

// Whether `subpath` is matched exactly by a key of `exportsMap`. Node.js skips
// exact matching for a subpath with `*` or ending in `/`, so a key ending in
// `/` (a removed folder mapping) exposes nothing.
function hasExactKey(exportsMap: Record<string, unknown>, subpath: string) {
  return (
    !subpath.includes('*') &&
    !subpath.endsWith('/') &&
    Object.hasOwn(exportsMap, subpath)
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
  const exportsMap = toExportsMap(exports)
  if (!exportsMap) {
    return false
  }

  if (hasExactKey(exportsMap, subpath)) {
    return hasExportTarget(exportsMap[subpath])
  }

  const patternKey = findPatternKey(exportsMap, subpath)
  if (patternKey == null) {
    return false
  }

  // Node.js rejects the specifier when the part matched by `*` has an invalid
  // segment, whichever target it would replace `*` in
  const starIndex = patternKey.indexOf('*')
  const trailerLength = patternKey.length - starIndex - 1
  const patternMatch = subpath.slice(starIndex, subpath.length - trailerLength)
  return (
    !hasInvalidSegment(patternMatch) && hasExportTarget(exportsMap[patternKey])
  )
}

// The `exports` subpath (`.` or `./name`) through which `importPath` would
// reference `packageName` itself, or `undefined` when it names another package
function getSelfReferenceSubpath(importPath: string, packageName: string) {
  if (importPath !== packageName && !importPath.startsWith(`${packageName}/`)) {
    return
  }
  return `.${importPath.slice(packageName.length)}`
}

// Whether `importPath` resolves to something other than `packageName` itself:
// a resolver alias can point the package's own name elsewhere, and a built-in
// module (`null`) takes precedence over a self-reference
function resolvesElsewhere(
  importPath: string,
  packageName: string,
  context: RuleContext,
) {
  const resolved = resolve(importPath, context)
  if (resolved === null) {
    return true
  }
  if (!resolved) {
    return false
  }
  const realPackageName = getFilePackageName(resolved)
  return !!realPackageName && realPackageName !== packageName
}

export default createRule<[Options?], MessageId>({
  name: 'no-self-package-import',
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
      selfPackageImport:
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

        // Node.js only resolves a self-reference to a path `exports` exposes
        const subpath = getSelfReferenceSubpath(importPath, packageName)
        if (subpath == null || !isExported(exports, subpath)) {
          return
        }

        if (ignoreTypeImports && isTypeOnlyImportOrExport(node)) {
          return
        }

        if (resolvesElsewhere(importPath, packageName, context)) {
          return
        }

        context.report({
          node: source,
          messageId: 'selfPackageImport',
          data: { importPath, packageName },
        })
      },
      { commonjs: true },
    )
  },
})
