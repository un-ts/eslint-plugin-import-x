/**
 * Rule to warn about potentially confused use of name exports
 */

import type { TSESTree } from '@typescript-eslint/utils'

import { importDeclaration, ExportMap, createRule } from '../utils/index.js'

type MessageId = 'member'

export default createRule<[], MessageId>({
  name: 'no-named-as-default-member',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Helpful warnings',
      description: 'Forbid use of exported name as property of default export.',
    },
    schema: [],
    messages: {
      member:
        "Caution: `{{objectName}}` also has a named export `{{propName}}`. Check if you meant to write `import {{{propName}}} from '{{sourcePath}}'` instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const fileImports = new Map<
      string,
      { exportMap: ExportMap; sourcePath: string }
    >()
    const allPropertyLookups = new Map<
      string,
      Array<{ node: TSESTree.Node; propName: string }>
    >()

    function storePropertyLookup(
      objectName: string,
      propName: string,
      node: TSESTree.Node,
    ) {
      const lookups = allPropertyLookups.get(objectName) || []
      lookups.push({ node, propName })
      allPropertyLookups.set(objectName, lookups)
    }

    return {
      ImportDefaultSpecifier(node) {
        const declaration = importDeclaration(context, node)
        const exportMap = ExportMap.get(declaration.source.value, context)
        if (exportMap == null) {
          return
        }

        if (exportMap.errors.length > 0) {
          exportMap.reportErrors(context, declaration)
          return
        }

        fileImports.set(node.local.name, {
          exportMap,
          sourcePath: declaration.source.value,
        })
      },

      MemberExpression(node) {
        if ('name' in node.object && 'name' in node.property) {
          storePropertyLookup(node.object.name, node.property.name, node)
        }
      },

      VariableDeclarator(node) {
        const isDestructure =
          node.id.type === 'ObjectPattern' && node.init?.type === 'Identifier'

        if (
          !isDestructure ||
          !node.init ||
          !('name' in node.init) ||
          !('properties' in node.id)
        ) {
          return
        }

        const objectName = node.init.name

        for (const prop of node.id.properties) {
          if (!('key' in prop) || !('name' in prop.key)) {
            continue
          } // true for rest properties
          storePropertyLookup(objectName, prop.key.name, prop.key)
        }
      },

      'Program:exit'() {
        for (const [objectName, lookups] of allPropertyLookups.entries()) {
          const fileImport = fileImports.get(objectName)
          if (fileImport == null) {
            continue
          }

          for (const { propName, node } of lookups) {
            // the default import can have a "default" property
            if (propName === 'default') {
              continue
            }
            if (!fileImport.exportMap.namespace.has(propName)) {
              continue
            }

            context.report({
              node,
              messageId: 'member',
              data: {
                objectName,
                propName,
                sourcePath: fileImport.sourcePath,
              },
            })
          }
        }
      },
    }
  },
})
