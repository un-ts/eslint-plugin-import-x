import type { TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

type Options = {
  target?: 'single' | 'any'
}

type MessageId = 'single' | 'any'

export = createRule<[Options?], MessageId>({
  name: 'prefer-default-export',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description:
        'Prefer a default export if module exports a single name or multiple names.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            enum: ['single', 'any'],
            default: 'single',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      single: 'Prefer default export on a file with single export.',
      any: 'Prefer default export to be present on every file that has export.',
    },
  },
  defaultOptions: [],
  create(context) {
    let specifierExportCount = 0
    let hasDefaultExport = false
    let hasStarExport = false
    let hasTypeExport = false

    let namedExportNode: TSESTree.Node

    // get options. by default we look into files with single export
    const { target = 'single' } = context.options[0] || {}

    function captureDeclaration(identifierOrPattern?: TSESTree.Node | null) {
      if (identifierOrPattern?.type === 'ObjectPattern') {
        // recursively capture
        identifierOrPattern.properties.forEach(property => {
          captureDeclaration(property.value)
        })
      } else if (identifierOrPattern?.type === 'ArrayPattern') {
        identifierOrPattern.elements.forEach(captureDeclaration)
      } else {
        // assume it's a single standard identifier
        specifierExportCount++
      }
    }

    return {
      ExportDefaultSpecifier() {
        hasDefaultExport = true
      },

      ExportSpecifier(node) {
        if (
          (node.exported.name ||
            ('value' in node.exported && node.exported.value)) === 'default'
        ) {
          hasDefaultExport = true
        } else {
          specifierExportCount++
          namedExportNode = node
        }
      },

      ExportNamedDeclaration(node) {
        // if there are specifiers, node.declaration should be null
        if (!node.declaration) {
          return
        }

        const { type } = node.declaration

        if (
          type === 'TSTypeAliasDeclaration' ||
          type === 'TSInterfaceDeclaration' ||
          // @ts-expect-error - legacy parser type
          type === 'TypeAlias' ||
          // @ts-expect-error - legacy parser type
          type === 'InterfaceDeclaration'
        ) {
          specifierExportCount++
          hasTypeExport = true
          return
        }

        if (
          'declarations' in node.declaration &&
          node.declaration.declarations
        ) {
          node.declaration.declarations.forEach(declaration => {
            captureDeclaration(declaration.id)
          })
        } else {
          // captures 'export function foo() {}' syntax
          specifierExportCount++
        }

        namedExportNode = node
      },

      ExportDefaultDeclaration() {
        hasDefaultExport = true
      },

      ExportAllDeclaration() {
        hasStarExport = true
      },

      'Program:exit'() {
        if (hasDefaultExport || hasStarExport || hasTypeExport) {
          return
        }
        if (target === 'single' && specifierExportCount === 1) {
          context.report({
            node: namedExportNode,
            messageId: 'single',
          })
        } else if (target === 'any' && specifierExportCount > 0) {
          context.report({
            node: namedExportNode,
            messageId: 'any',
          })
        }
      },
    }
  },
})
