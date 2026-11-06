/**
 * @file Rule to warn about importing a default export by different name
 * @author James Whitney
 * @author [Sukka](https://skk.moe) - Port to TypeScript
 */

import path from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'

import { getDefaultExportSourceName, ModuleInfo } from '../core/index.js'
import { createRule, getValue } from '../utils/index.js'
import type { ModuleOptions } from '../utils/index.js'
import { reportModuleParseErrors } from '../utils/report-module-parse-errors.js'

function toIdentifierKey(name: string) {
  return name.replaceAll(/[^\dA-Za-z]/g, '').toLowerCase()
}

function getModuleIdentifier(sourcePath: string) {
  const [specifier] = sourcePath.split(/[?#]/)
  if (!specifier || specifier.startsWith('.') || path.isAbsolute(specifier)) {
    return
  }
  const parts = specifier.split('/')
  const name =
    specifier.startsWith('@') && parts.length === 2 ? parts[1] : parts.at(-1)
  return name ? toIdentifierKey(name) : undefined
}

export type Options = ModuleOptions & {
  preventRenamingBindings?: boolean
  whitelist?: string[]
}

export type MessageId = 'renameDefault'

export default createRule<[Options?], MessageId>({
  name: 'no-rename-default',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Helpful warnings',
      description: 'Forbid importing a default export by a different name.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          commonjs: {
            default: false,
            type: 'boolean',
          },
          preventRenamingBindings: {
            default: true,
            type: 'boolean',
          },
          whitelist: {
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      renameDefault:
        'Caution: `{{importBasename}}` has a default export `{{defaultExportName}}`. This {{requiresOrImports}} `{{defaultExportName}}` as `{{importName}}`. Check if you meant to write `{{suggestion}}` instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    const {
      commonjs = false,
      preventRenamingBindings = true,
      whitelist,
    } = context.options[0] || {}
    const whitelistSet = whitelist ? new Set(whitelist) : undefined
    const isModuleName = (sourcePath: string, localName: string) => {
      const moduleIdentifier = getModuleIdentifier(sourcePath)
      return (
        moduleIdentifier !== undefined &&
        moduleIdentifier === toIdentifierKey(localName)
      )
    }

    function getDefaultExportName(moduleInfo: ModuleInfo) {
      const sourceName = getDefaultExportSourceName(moduleInfo)
      if (sourceName == null) {
        return
      }
      if (sourceName.isBoundName && !preventRenamingBindings) {
        // Allow bound names (identifier references and assignments) to be
        // renamed when the `preventRenamingBindings` option is set to
        // `false`.
        //
        // const foo = 'foo';
        // export default foo;
        return
      }
      return sourceName.name
    }

    function getModuleInfo(source: TSESTree.StringLiteral | null) {
      if (!source) {
        return
      }
      const moduleInfo = ModuleInfo.get(source.value, context)
      if (moduleInfo == null) {
        return
      }
      if (moduleInfo.parseError) {
        reportModuleParseErrors(context, moduleInfo, { source })
        return
      }
      return moduleInfo
    }

    function handleImport(
      node: TSESTree.ImportDefaultSpecifier | TSESTree.ImportSpecifier,
    ) {
      const importTarget = node.parent.source?.value
      if (!importTarget || whitelistSet?.has(importTarget)) {
        return
      }

      const moduleInfo = getModuleInfo(node.parent.source)
      if (moduleInfo == null) {
        return
      }

      const defaultExportName = getDefaultExportName(moduleInfo)
      if (defaultExportName === undefined) {
        return
      }

      const importBasename = path.basename(moduleInfo.path)

      if (node.type === 'ImportDefaultSpecifier') {
        const importName = node.local.name

        if (
          importName === defaultExportName ||
          isModuleName(importTarget, importName)
        ) {
          return
        }

        context.report({
          node,
          messageId: 'renameDefault',
          data: {
            importBasename,
            defaultExportName,
            importName,
            requiresOrImports: 'imports',
            suggestion: `import ${defaultExportName} from '${importTarget}'`,
          },
        })

        return
      }

      if (node.type !== 'ImportSpecifier') {
        return
      }

      if (getValue(node.imported) !== 'default') {
        return
      }

      const actualImportedName = node.local.name

      if (
        actualImportedName === defaultExportName ||
        isModuleName(importTarget, actualImportedName)
      ) {
        return
      }

      context.report({
        node,
        messageId: 'renameDefault',
        data: {
          importBasename,
          defaultExportName,
          importName: actualImportedName,
          requiresOrImports: 'imports',
          suggestion: `import { default as ${defaultExportName} } from '${importTarget}'`,
        },
      })
    }

    function handleRequire(node: TSESTree.VariableDeclarator) {
      if (
        !commonjs ||
        node.type !== 'VariableDeclarator' ||
        !node.id ||
        !(node.id.type === 'Identifier' || node.id.type === 'ObjectPattern') ||
        !node.init ||
        node.init.type !== 'CallExpression'
      ) {
        return
      }

      let defaultDestructure
      if (node.id.type === 'ObjectPattern') {
        defaultDestructure = findDefaultDestructure(node.id.properties)
        if (defaultDestructure === undefined) {
          return
        }
      }

      const call = node.init
      const [source] = call.arguments

      if (
        call.callee.type !== 'Identifier' ||
        call.callee.name !== 'require' ||
        call.arguments.length !== 1 ||
        source.type !== 'Literal' ||
        typeof source.value !== 'string'
      ) {
        return
      }

      const requireTarget = source.value
      if (whitelistSet?.has(requireTarget)) {
        return
      }

      const moduleInfo = getModuleInfo(source)
      if (moduleInfo == null) {
        return
      }

      const defaultExportName = getDefaultExportName(moduleInfo)
      const requireBasename = path.basename(moduleInfo.path)

      let requireName
      if (node.id.type === 'Identifier') {
        requireName = node.id.name
      } else if (defaultDestructure?.value?.type === 'Identifier') {
        requireName = defaultDestructure.value.name
      } else {
        requireName = ''
      }

      if (defaultExportName === undefined) {
        return
      }

      if (
        requireName === defaultExportName ||
        isModuleName(requireTarget, requireName)
      ) {
        return
      }

      if (node.id.type === 'Identifier') {
        context.report({
          node,
          messageId: 'renameDefault',
          data: {
            importBasename: requireBasename,
            defaultExportName,
            importName: requireName,
            requiresOrImports: 'requires',
            suggestion: `const ${defaultExportName} = require('${requireTarget}')`,
          },
        })
        return
      }

      context.report({
        node,
        messageId: 'renameDefault',
        data: {
          importBasename: requireBasename,
          defaultExportName,
          importName: requireName,
          requiresOrImports: 'requires',
          suggestion: `const { default: ${defaultExportName} } = require('${requireTarget}')`,
        },
      })
    }

    return {
      ImportDefaultSpecifier: handleImport,
      ImportSpecifier: handleImport,
      VariableDeclarator: handleRequire,
    }
  },
})

function findDefaultDestructure(
  properties: Array<TSESTree.Property | TSESTree.RestElement>,
) {
  const found = properties.find(property => {
    if (
      'key' in property &&
      'name' in property.key &&
      property.key.name === 'default'
    ) {
      return property
    }
  })
  return found
}
