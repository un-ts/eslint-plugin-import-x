/** Ensures that there are no useless path segments */

import fs from 'node:fs'
import path from 'node:path'

import type { ModuleOptions } from '../utils/index.js'
import {
  createRule,
  moduleVisitor,
  resolve,
  getFileExtensions,
  importType,
} from '../utils/index.js'

/**
 * Convert a potentially relative path from node utils into a true relative
 * path.
 *
 * `../ -> ..`
 *
 * `./ -> .`
 *
 * `.foo/bar -> ./.foo/bar`
 *
 * `..foo/bar -> ./..foo/bar`
 *
 * `foo/bar -> ./foo/bar`
 *
 * @param relativePath Relative posix path potentially missing leading './'
 * @returns Relative posix path that always starts with a ./
 */
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

export interface Options extends ModuleOptions {
  noUselessIndex?: boolean
}

export type MessageId = 'useless'

export default createRule<[Options?], MessageId>({
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
    const currentDir = path.dirname(context.physicalFilename)

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

      const fileExtensions = getFileExtensions(context.settings)
      const regexUnnecessaryIndex = new RegExp(
        `.*\\/index(\\${[...fileExtensions].join('|\\')})?$`,
      )

      /**
       * Whether `importDir` (e.g. `@/pages`, resolving to
       * `<root>/pages/index.js`) is below its alias root rather than being the
       * alias root itself. It is when a sibling file of the target directory
       * resolves through the same prefix (`@/bar.js` -> `<root>/bar.js`), which
       * an alias root of exactly `app/components` would not allow.
       */
      function isBelowAliasRoot(importDir: string, resolvedPath: string) {
        const targetDir = path.dirname(resolvedPath)
        if (path.basename(targetDir) !== path.posix.basename(importDir)) {
          return false
        }
        const outerDir = path.dirname(targetDir)
        const prefix = path.posix.dirname(importDir)
        let entries: fs.Dirent[]
        try {
          entries = fs.readdirSync(outerDir, { withFileTypes: true })
        } catch {
          return false
        }
        return entries.some(
          entry =>
            entry.isFile() &&
            resolve(`${prefix}/${entry.name}`, context) ===
              path.join(outerDir, entry.name),
        )
      }

      // Only relative imports are relevant for this rule, except for a useless
      // index in an aliased import of a local file (e.g. `@/foo/index.js`).
      // Node subpath imports (`#app/pages/index`) are excluded: ESM rejects
      // bare directory paths like `#app/pages` even when a resolver accepts them.
      if (!importPath.startsWith('.')) {
        if (
          options.noUselessIndex &&
          regexUnnecessaryIndex.test(importPath) &&
          !importPath.startsWith('#') &&
          importType(importPath, context) === 'internal'
        ) {
          const resolvedPath = resolve(importPath, context)
          const parentDirectory = path.posix.dirname(importPath)

          // Only propose a path that the resolver maps to the same file, and
          // never a bare alias root like `@`, which the build config may not
          // support even if the resolver does (`@/*` without `@` in tsconfig).
          // The same goes for any alias root, such as `app/components` or
          // `@scope/lib`: a wildcard mapping `app/components/*` does not imply
          // that the bare `app/components` is valid, so `isBelowAliasRoot`
          // checks that the alias root sits above the proposed path.
          // Skip when the resolved path is inside node_modules: internal-regex
          // can make importType return 'internal' for a node_modules alias, but
          // we must not auto-fix external package imports.
          if (
            resolvedPath &&
            parentDirectory.includes('/') &&
            !resolvedPath.includes(`${path.sep}node_modules${path.sep}`) &&
            isBelowAliasRoot(parentDirectory, resolvedPath)
          ) {
            for (const proposedPath of [
              parentDirectory,
              `${parentDirectory}/`,
            ]) {
              if (resolve(proposedPath, context) === resolvedPath) {
                return reportWithProposedPath(proposedPath)
              }
            }
          }
        }
        return
      }

      // Report rule violation if path is not the shortest possible
      const resolvedPath = resolve(importPath, context)!
      const normedPath = normalize(importPath)
      const resolvedNormedPath = resolve(normedPath, context)
      if (normedPath !== importPath && resolvedPath === resolvedNormedPath) {
        return reportWithProposedPath(normedPath)
      }

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
