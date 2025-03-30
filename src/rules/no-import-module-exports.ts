import path from 'node:path'

import { cjsRequire } from '@pkgr/core'
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { minimatch } from 'minimatch'

import type { RuleContext } from '../types.js'
import { createRule, pkgUp } from '../utils/index.js'

function getEntryPoint(context: RuleContext) {
  const pkgPath = pkgUp({
    cwd: context.physicalFilename,
  })!
  try {
    return cjsRequire.resolve(path.dirname(pkgPath))
  } catch {
    // Assume the package has no entrypoint (e.g. CLI packages)
    // in which case require.resolve would throw.
    return null
  }
}

function findScope(context: RuleContext, identifier: string) {
  const { scopeManager } = context.sourceCode
  return scopeManager?.scopes

    .slice()
    .reverse()
    .find(scope =>
      scope.variables.some(variable =>
        variable.identifiers.some(node => node.name === identifier),
      ),
    )
}

function findDefinition(objectScope: TSESLint.Scope.Scope, identifier: string) {
  const variable = objectScope.variables.find(
    variable => variable.name === identifier,
  )!
  return variable.defs.find(
    def => 'name' in def.name && def.name.name === identifier,
  )
}

export interface Options {
  exceptions?: string[]
}

type MessageId = 'notAllowed'

export default createRule<[Options?], MessageId>({
  name: 'no-import-module-exports',
  meta: {
    type: 'problem',
    docs: {
      category: 'Module systems',
      description: 'Forbid import statements with CommonJS module.exports.',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          exceptions: { type: 'array' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      notAllowed:
        "Cannot use import declarations in modules that export using CommonJS (module.exports = 'foo' or exports.bar = 'hi')",
    },
  },
  defaultOptions: [],
  create(context) {
    const importDeclarations: TSESTree.ImportDeclaration[] = []
    const entryPoint = getEntryPoint(context)
    const options = context.options[0] || {}

    let alreadyReported = false

    return {
      ImportDeclaration(node) {
        importDeclarations.push(node)
      },
      MemberExpression(node) {
        if (alreadyReported) {
          return
        }

        const filename = context.physicalFilename
        const isEntryPoint = entryPoint === filename
        const isIdentifier = node.object.type === 'Identifier'

        if (!('name' in node.object)) {
          return
        }

        const hasKeywords = /^(module|exports)$/.test(node.object.name)
        const objectScope = hasKeywords
          ? findScope(context, node.object.name)
          : undefined
        const variableDefinition =
          objectScope && findDefinition(objectScope, node.object.name)

        const isImportBinding = variableDefinition?.type === 'ImportBinding'
        const hasCJSExportReference =
          hasKeywords && (!objectScope || objectScope.type === 'module')

        if (
          isIdentifier &&
          hasCJSExportReference &&
          !isEntryPoint &&
          !options.exceptions?.some(glob => minimatch(filename, glob)) &&
          !isImportBinding
        ) {
          for (const importDeclaration of importDeclarations) {
            context.report({
              node: importDeclaration,
              messageId: 'notAllowed',
            })
          }
          alreadyReported = true
        }
      },
    }
  },
})
