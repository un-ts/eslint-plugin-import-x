import path from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'
import { getFilename, getPhysicalFilename } from 'eslint-compat-utils'

import { ExportMap, createRule } from '../utils'
import type { ModuleOptions } from '../utils'

type MessageId = 'notFound' | 'notFoundDeep'

export = createRule<[ModuleOptions?], MessageId>({
  name: 'named',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description:
        'Ensure named imports correspond to a named export in the remote file.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          commonjs: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      notFound: "{{name}} not found in '{{path}}'",
      notFoundDeep: '{{name}} not found via {{deepPath}}',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}

    function checkSpecifiers(
      key: 'imported' | 'local',
      type: 'ImportSpecifier' | 'ExportSpecifier',
      node: TSESTree.ImportDeclaration | TSESTree.ExportNamedDeclaration,
    ) {
      // ignore local exports and type imports/exports
      if (
        node.source == null ||
        ('importKind' in node &&
          (node.importKind === 'type' ||
            // @ts-expect-error - flow type
            node.importKind === 'typeof')) ||
        ('exportKind' in node && node.exportKind === 'type')
      ) {
        return
      }

      if (!node.specifiers.some(im => im.type === type)) {
        return // no named imports/exports
      }

      const imports = ExportMap.get(node.source.value, context)
      if (imports == null || imports.parseGoal === 'ambiguous') {
        return
      }

      if (imports.errors.length > 0) {
        imports.reportErrors(context, node)
        return
      }

      for (const im of node.specifiers) {
        if (
          im.type !== type ||
          // ignore type imports
          ('importKind' in im &&
            (im.importKind === 'type' ||
              // @ts-expect-error - flow type
              im.importKind === 'typeof'))
        ) {
          continue
        }

        /**
         * @see im is @see TSESTree.ExportSpecifier or @see TSESTree.ImportSpecifier
         */
        // @ts-expect-error - it sucks, see above
        const imNode = im[key] as TSESTree.Identifier

        const name =
          imNode.name ||
          // @ts-expect-error - old version ast
          (imNode.value as string)

        const deepLookup = imports.hasDeep(name)

        if (!deepLookup.found) {
          if (deepLookup.path.length > 1) {
            const deepPath = deepLookup.path
              .map(i =>
                path.relative(
                  path.dirname(getPhysicalFilename(context)),
                  i.path,
                ),
              )
              .join(' -> ')

            context.report({
              node: imNode,
              messageId: 'notFoundDeep',
              data: {
                name,
                deepPath,
              },
            })
          } else {
            context.report({
              node: imNode,
              messageId: 'notFound',
              data: {
                name,
                path: node.source.value,
              },
            })
          }
        }
      }
    }

    return {
      ImportDeclaration: checkSpecifiers.bind(
        null,
        'imported',
        'ImportSpecifier',
      ),

      ExportNamedDeclaration: checkSpecifiers.bind(
        null,
        'local',
        'ExportSpecifier',
      ),

      VariableDeclarator(node) {
        if (
          !options.commonjs ||
          node.type !== 'VariableDeclarator' ||
          // return if it's not an object destructure or it's an empty object destructure
          !node.id ||
          node.id.type !== 'ObjectPattern' ||
          node.id.properties.length === 0 ||
          // return if there is no call expression on the right side
          !node.init ||
          node.init.type !== 'CallExpression'
        ) {
          return
        }

        const call = node.init
        const source = call.arguments[0] as TSESTree.StringLiteral

        const variableImports = node.id.properties
        const variableExports = ExportMap.get(source.value, context)

        if (
          // return if it's not a commonjs require statement
          call.callee.type !== 'Identifier' ||
          call.callee.name !== 'require' ||
          call.arguments.length !== 1 ||
          // return if it's not a string source
          source.type !== 'Literal' ||
          variableExports == null ||
          variableExports.parseGoal === 'ambiguous'
        ) {
          return
        }

        if (variableExports.errors.length > 0) {
          variableExports.reportErrors(
            context,
            // @ts-expect-error - FIXME: no idea yet
            node,
          )
          return
        }

        for (const im of variableImports) {
          if (
            im.type !== 'Property' ||
            !im.key ||
            im.key.type !== 'Identifier'
          ) {
            continue
          }

          const deepLookup = variableExports.hasDeep(im.key.name)

          if (!deepLookup.found) {
            if (deepLookup.path.length > 1) {
              const deepPath = deepLookup.path
                .map(i =>
                  path.relative(path.dirname(getFilename(context)), i.path),
                )
                .join(' -> ')

              context.report({
                node: im.key,
                messageId: 'notFoundDeep',
                data: {
                  name: im.key.name,
                  deepPath,
                },
              })
            } else {
              context.report({
                node: im.key,
                messageId: 'notFound',
                data: {
                  name: im.key.name,
                  path: source.value,
                },
              })
            }
          }
        }
      },
    }
  },
})
