import {
  countModuleSurface,
  createRule,
  isBarrelFileSurface,
} from '../utils/index.js'

export interface Options {
  amountOfExportsToConsiderModuleAsBarrel?: number
}

export type MessageId = 'avoidBarrel'

const defaultOptions: Required<Options> = {
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
            default: defaultOptions.amountOfExportsToConsiderModuleAsBarrel,
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
  create(context, [options = defaultOptions]) {
    const amountOfExportsToConsiderModuleAsBarrel =
      options.amountOfExportsToConsiderModuleAsBarrel ??
      defaultOptions.amountOfExportsToConsiderModuleAsBarrel

    return {
      Program(node) {
        const surface = countModuleSurface(node.body)

        if (
          isBarrelFileSurface(surface, amountOfExportsToConsiderModuleAsBarrel)
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
