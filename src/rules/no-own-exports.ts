import path from 'node:path'

import { minimatch } from 'minimatch'

import type { RuleContext } from '../types.js'
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

    if (!packageName || pkg.exports == null) {
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

        if (ignoreTypeImports && isTypeOnlyImportOrExport(node)) {
          return
        }

        // A resolver alias can point the package's own name elsewhere
        const resolved = resolve(importPath, context)
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
