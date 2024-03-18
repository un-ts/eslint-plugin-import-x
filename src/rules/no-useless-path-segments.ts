/**
 * Ensures that there are no useless path segments
 */

import path from 'node:path'

import type { ModuleOptions } from '../utils'
import { createRule, moduleVisitor, resolve, getFileExtensions } from '../utils'

/**
 * convert a potentially relative path from node utils into a true
 * relative path.
 *
 * ../ -> ..
 * ./ -> .
 * .foo/bar -> ./.foo/bar
 * ..foo/bar -> ./..foo/bar
 * foo/bar -> ./foo/bar
 *
 * @param relativePath relative posix path potentially missing leading './'
 * @returns relative posix path that always starts with a ./
 **/
function toRelativePath(relativePath: string): string {
  const stripped = relativePath.replaceAll(/\/$/g, '') // Remove trailing /

  return /^((\.\.)|(\.))($|\/)/.test(stripped) ? stripped : `./${stripped}`
}

function normalize(filepath: string) {
  return toRelativePath(path.posix.normalize(filepath))
}

function countRelativeParents(pathSegments: string[]) {
  return pathSegments.filter(x => x === '..').length
}

type Options = ModuleOptions & {
  noUselessIndex?: boolean
}

type MessageId = 'useless'

export = createRule<[Options?], MessageId>({
  name: 'no-useless-path-segments',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description:
        'Forbid unnecessary path segments in import and require statements.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          commonjs: { type: 'boolean' },
          noUselessIndex: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      useless:
        'Useless path segments for "{{importPath}}", should be "{{proposedPath}}"',
    },
  },
  defaultOptions: [],
  create(context) {
    const currentDir = path.dirname(
      context.getPhysicalFilename
        ? context.getPhysicalFilename()
        : context.getFilename(),
    )

    const options = context.options[0] || {}

    return moduleVisitor(source => {
      const { value: importPath } = source

      function reportWithProposedPath(proposedPath: string) {
        context.report({
          node: source,
          messageId: 'useless',
          data: {
            importPath,
            proposedPath,
          },
          fix: fixer =>
            proposedPath
              ? fixer.replaceText(source, JSON.stringify(proposedPath))
              : null,
        })
      }

      // Only relative imports are relevant for this rule --> Skip checking
      if (!importPath.startsWith('.')) {
        return
      }

      // Report rule violation if path is not the shortest possible
      const resolvedPath = resolve(importPath, context)!
      const normedPath = normalize(importPath)
      const resolvedNormedPath = resolve(normedPath, context)
      if (normedPath !== importPath && resolvedPath === resolvedNormedPath) {
        return reportWithProposedPath(normedPath)
      }

      const fileExtensions = getFileExtensions(context.settings)
      const regexUnnecessaryIndex = new RegExp(
        `.*\\/index(\\${[...fileExtensions].join('|\\')})?$`,
      )

      // Check if path contains unnecessary index (including a configured extension)
      if (options.noUselessIndex && regexUnnecessaryIndex.test(importPath)) {
        const parentDirectory = path.dirname(importPath)

        // Try to find ambiguous imports
        if (parentDirectory !== '.' && parentDirectory !== '..') {
          for (const fileExtension of fileExtensions) {
            if (resolve(`${parentDirectory}${fileExtension}`, context)) {
              return reportWithProposedPath(`${parentDirectory}/`)
            }
          }
        }

        return reportWithProposedPath(parentDirectory)
      }

      // Path is shortest possible + starts from the current directory --> Return directly
      if (importPath.startsWith('./')) {
        return
      }

      // Path is not existing --> Return directly (following code requires path to be defined)
      if (resolvedPath === undefined) {
        return
      }

      const expected = path.relative(currentDir, resolvedPath) // Expected import path
      const expectedSplit = expected.split(path.sep) // Split by / or \ (depending on OS)
      const importPathSplit = importPath.replace(/^\.\//, '').split('/')
      const countImportPathRelativeParents =
        countRelativeParents(importPathSplit)
      const countExpectedRelativeParents = countRelativeParents(expectedSplit)
      const diff = countImportPathRelativeParents - countExpectedRelativeParents

      // Same number of relative parents --> Paths are the same --> Return directly
      if (diff <= 0) {
        return
      }

      // Report and propose minimal number of required relative parents
      return reportWithProposedPath(
        toRelativePath(
          [
            ...importPathSplit.slice(0, countExpectedRelativeParents),
            ...importPathSplit.slice(countImportPathRelativeParents + diff),
          ].join('/'),
        ),
      )
    }, options)
  },
})
