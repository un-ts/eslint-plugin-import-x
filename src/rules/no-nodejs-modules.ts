import { importType } from '../core/import-type'
import { moduleVisitor } from '../utils/module-visitor'
import { createRule } from '../utils'

type Options = {
  allow?: string[]
}

type MessageId = 'builtin'

export = createRule<[Options?], MessageId>({
  name: 'no-nodejs-modules',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Module systems',
      description: 'Forbid Node.js builtin modules.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
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
      builtin: 'Do not import Node.js builtin module "{{moduleName}}"',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}
    const allowed = options.allow || []

    return moduleVisitor(
      (source, node) => {
        const moduleName = source.value
        if (
          allowed.indexOf(moduleName) === -1 &&
          importType(moduleName, context) === 'builtin'
        ) {
          context.report({
            node,
            messageId: 'builtin',
            data: {
              moduleName,
            },
          })
        }
      },
      { commonjs: true },
    )
  },
})
