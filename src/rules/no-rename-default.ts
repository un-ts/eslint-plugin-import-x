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

/**
 * Splits an identifier or module name into lower-cased word tokens.
 *
 * @param name - The identifier or module name to split.
 * @returns The lower-cased word tokens.
 */
function toIdentifierTokens(name: string) {
  return name
    .replaceAll(/([\da-z])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^\dA-Za-z]+/)
    .filter(Boolean)
    .map(token => token.toLowerCase())
}

/**
 * Removes a module file extension from a subpath segment.
 *
 * @param name - The subpath segment.
 * @returns The segment without its extension.
 */
function stripModuleSuffix(name: string) {
  return name.replace(/\.d\.[cm]?ts$/, '').replace(/\.[^./]+$/, '')
}

/**
 * Gets the meaningful name of a bare module specifier: the package name for a
 * package root, otherwise the final subpath segment, ignoring an `index`
 * segment or a file extension.
 *
 * @param sourcePath - The module specifier as written.
 * @returns The module name, if the specifier is bare.
 */
function getModuleName(sourcePath: string) {
  const [specifier] = sourcePath.split(/[?#]/)
  if (!specifier || specifier.startsWith('.') || path.isAbsolute(specifier)) {
    return
  }
  const parts = specifier.split('/')
  const isScoped = specifier.startsWith('@')
  const packageParts = isScoped ? 2 : 1
  const packageName = parts[isScoped ? 1 : 0]
  if (!packageName) {
    return
  }
  const subpath = parts.slice(packageParts)
  if (subpath.length === 0) {
    return packageName
  }
  let name = stripModuleSuffix(subpath.at(-1)!)
  if (name === 'index' && subpath.length > 1) {
    name = stripModuleSuffix(subpath.at(-2)!)
  }
  return !name || name === 'index' ? packageName : name
}

/**
 * Whether a local name is a word-sequence spelling of a bare module name.
 *
 * @param sourcePath - The module specifier as written.
 * @param localName - The imported local binding name.
 * @returns Whether the local name matches the module's name.
 */
function isModuleName(sourcePath: string, localName: string) {
  const moduleName = getModuleName(sourcePath)
  if (!moduleName) {
    return false
  }
  const moduleTokens = toIdentifierTokens(moduleName)
  const localTokens = toIdentifierTokens(localName)
  if (
    moduleTokens.length === localTokens.length &&
    moduleTokens.every((token, index) => token === localTokens[index])
  ) {
    return true
  }
  // A package without separators can still be camel-cased in the local name:
  // `somepackage` -> `somePackage`.
  return (
    moduleTokens.length === 1 &&
    moduleName.toLowerCase() === localName.toLowerCase()
  )
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
