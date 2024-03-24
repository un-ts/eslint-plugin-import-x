import path from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'
import { getPhysicalFilename } from 'eslint-compat-utils'

import type { RuleContext } from '../types'
import type { ModuleOptions } from '../utils'
import {
  importType,
  createRule,
  moduleVisitor,
  makeOptionsSchema,
  resolve,
  readPkgUp,
} from '../utils'

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
  const resolvedContext = getPhysicalFilename(context)

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
    const importBaseName = path.basename(importPath)
    const importRoot = path.dirname(importPkg.path)
    const properPath = path.relative(importRoot, resolvedImport)
    const properImport = path.join(
      importPkg.pkg.name,
      path.dirname(properPath),
      importBaseName === path.basename(importRoot) ? '' : importBaseName,
    )
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

export = createRule<[ModuleOptions?], MessageId>({
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
