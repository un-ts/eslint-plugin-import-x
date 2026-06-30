import { createRule } from '../utils/index.js'

export interface Options {
  amountOfExportsToConsiderModuleAsBarrel: number
}

export type MessageId = 'avoidBarrel'

const defaultOptions: Options = {
  amountOfExportsToConsiderModuleAsBarrel: 3,
}

export default createRule<[Options?], MessageId>({
  name: 'avoid-barrel-files',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Forbid authoring of barrel files.',
      category: 'Performance',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          amountOfExportsToConsiderModuleAsBarrel: {
            type: 'number',
            description:
              'Minimum amount of exports to consider module as barrelfile',
            default: 3,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      avoidBarrel:
        'Avoid barrel files, they slow down performance, and cause large module graphs with modules that go unused.',
    },
  },
  defaultOptions: [defaultOptions],
  create(context) {
    const options = context.options[0] || defaultOptions
    const amountOfExportsToConsiderModuleAsBarrel =
      options.amountOfExportsToConsiderModuleAsBarrel

    return {
      Program(node) {
        let declarations = 0
        let exports = 0

        for (const n of node.body) {
          if (n.type === 'VariableDeclaration') {
            declarations += n.declarations.length
          }

          if (
            n.type === 'FunctionDeclaration' ||
            n.type === 'ClassDeclaration' ||
            n.type === 'TSTypeAliasDeclaration' ||
            n.type === 'TSInterfaceDeclaration'
          ) {
            declarations += 1
          }

          if (n.type === 'ExportNamedDeclaration') {
            exports += n.specifiers.length
          }

          if (n.type === 'ExportAllDeclaration' && n?.exportKind !== 'type') {
            exports += 1
          }

          if (n.type === 'ExportDefaultDeclaration') {
            if (
              n.declaration.type === 'FunctionDeclaration' ||
              n.declaration.type === 'CallExpression'
            ) {
              declarations += 1
            } else if (n.declaration.type === 'ObjectExpression') {
              exports += n.declaration.properties.length
            } else {
              exports += 1
            }
          }
        }

        if (
          exports > declarations &&
          exports > amountOfExportsToConsiderModuleAsBarrel
        ) {
          context.report({
            node,
            messageId: 'avoidBarrel',
          })
        }
      },
    }
  },
})
