import fs from 'node:fs'
import path from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'
import {
  importType,
  createRule,
  moduleVisitor,
  makeOptionsSchema,
  resolve,
  readPkgUp,
} from '../utils/index.js'
import type { ModuleOptions } from '../utils/index.js'

function toPosixPath(filePath: string) {
  return filePath.replaceAll('\\', '/')
}

function findNamedPackage(filePath: string) {
  const found = readPkgUp({ cwd: filePath })
  if (found.pkg && !found.pkg.name) {
    return findNamedPackage(path.resolve(found.path, '../..'))
  }
  return found
}

type MessageId = 'noAllowed'

const potentialViolationTypes = new Set(['parent', 'index', 'sibling'])

function checkImportForRelativePackage(
  context: RuleContext<MessageId>,
  importPath: string,
  node: TSESTree.StringLiteral,
) {
  if (!potentialViolationTypes.has(importType(importPath, context))) {
    return
  }

  const resolvedImport = resolve(importPath, context)
  const resolvedContext = context.physicalFilename

  if (!resolvedImport || !resolvedContext) {
    return
  }

  const importPkg = findNamedPackage(resolvedImport)
  const contextPkg = findNamedPackage(resolvedContext)

  if (
    importPkg.pkg &&
    contextPkg.pkg &&
    importPkg.pkg.name !== contextPkg.pkg.name
  ) {
    // Keep the import's own path below the package root, so a directory or an
    // extensionless import keeps pointing at the same module. A resolver may
    // follow symlinks, so use that path only when it still points into the
    // resolved package; otherwise fall back to the resolved file.
    const importTarget = path.resolve(path.dirname(resolvedContext), importPath)
    const targetPkg = findNamedPackage(importTarget)
    const targetPkgRoot =
      targetPkg.pkg && targetPkg.path ? path.dirname(targetPkg.path) : undefined
    const isSamePackage =
      targetPkgRoot != null &&
      targetPkg.pkg?.name === importPkg.pkg.name &&
      fs.realpathSync(targetPkgRoot) ===
        fs.realpathSync(path.dirname(importPkg.path))
    const resolvedSuffix = path.relative(
      path.dirname(importPkg.path),
      resolvedImport,
    )
    const { dir, name } = path.parse(resolvedSuffix)
    const importSuffix = path.extname(importPath)
      ? resolvedSuffix
      : path.join(dir, name)
    const properImport =
      isSamePackage && targetPkgRoot
        ? path.join(
            importPkg.pkg.name,
            path.relative(targetPkgRoot, importTarget),
          )
        : path.join(importPkg.pkg.name, importSuffix)
    context.report({
      node,
      messageId: 'noAllowed',
      data: {
        properImport,
        importPath,
      },
      fix: fixer =>
        fixer.replaceText(node, JSON.stringify(toPosixPath(properImport))),
    })
  }
}

export default createRule<[ModuleOptions?], MessageId>({
  name: 'no-relative-packages',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description: 'Forbid importing packages through relative paths.',
    },
    fixable: 'code',
    schema: [makeOptionsSchema()],
    messages: {
      noAllowed:
        'Relative import from another package is not allowed. Use `{{properImport}}` instead of `{{importPath}}`',
    },
  },
  defaultOptions: [],
  create(context) {
    return moduleVisitor(
      source => checkImportForRelativePackage(context, source.value, source),
      context.options[0],
    )
  },
})
