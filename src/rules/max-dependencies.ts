import type { TSESTree } from '@typescript-eslint/utils'

import { createRule, moduleVisitor } from '../utils'

type Options = {
  ignoreTypeImports?: boolean
  max?: number
}

type MessageId = 'max'

export = createRule<[Options?], MessageId>({
  name: 'max-dependencies',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description:
        'Enforce the maximum number of dependencies a module can have.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'number' },
          ignoreTypeImports: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      max: 'Maximum number of dependencies ({{max}}) exceeded.',
    },
  },
  defaultOptions: [],
  create(context) {
    const { ignoreTypeImports } = context.options[0] || {}

    const dependencies = new Set<string>() // keep track of dependencies

    let lastNode: TSESTree.StringLiteral // keep track of the last node to report on

    return {
      'Program:exit'() {
        const { max = 10 } = context.options[0] || {}

        if (dependencies.size <= max) {
          return
        }

        context.report({
          node: lastNode,
          messageId: 'max',
          data: {
            max,
          },
        })
      },
      ...moduleVisitor(
        (source, node) => {
          if (
            ('importKind' in node && node.importKind !== 'type') ||
            !ignoreTypeImports
          ) {
            dependencies.add(source.value)
          }
          lastNode = source
        },
        { commonjs: true },
      ),
    }
  },
})
