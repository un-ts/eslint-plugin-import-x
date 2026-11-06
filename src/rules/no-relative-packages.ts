import path from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'
import {
  importType,
  createRule,
  moduleVisitor,
  makeOptionsSchema,
  relative,
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

type MessageId = 'noAllowed' | 'noAllowedNoFix'

const dtsRe = /\.d\.[cm]?ts$/

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
    const resolvedSuffix = path.relative(
      path.dirname(importPkg.path),
      resolvedImport,
    )
    const { dir, name } = path.parse(resolvedSuffix)
    const moduleName = dtsRe.test(resolvedSuffix) ? name.slice(0, -2) : name
    const importExtension = path.extname(importPath)
    let importSuffix: string
    if (importExtension) {
      importSuffix = path.format({
        dir,
        name: moduleName,
        ext: importExtension,
      })
    } else {
      // A directory import resolves to its index file; an explicit `index`
      // import is already a file and keeps that segment.
      importSuffix =
        moduleName === 'index' && path.basename(importPath) !== 'index'
          ? dir
          : path.join(dir, moduleName)
    }
    const properImport = path.join(importPkg.pkg.name, importSuffix)
    const normalizedProperImport = toPosixPath(properImport)
    let resolvedProperImport: string | null | undefined
    try {
      resolvedProperImport = relative(
        normalizedProperImport,
        resolvedContext,
        context.settings,
        context,
      )
    } catch {
      resolvedProperImport = undefined
    }
    const canFix = resolvedProperImport === resolvedImport
    context.report({
      node,
      messageId: canFix ? 'noAllowed' : 'noAllowedNoFix',
      data: {
        properImport: normalizedProperImport,
        importPath,
      },
      ...(canFix && {
        fix: fixer =>
          fixer.replaceText(node, JSON.stringify(normalizedProperImport)),
      }),
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
      noAllowedNoFix:
        'Relative import from another package is not allowed. No safe package import could be determined for "{{importPath}}".',
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
