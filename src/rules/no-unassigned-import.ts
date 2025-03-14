import path from 'node:path'

import { isStaticRequire, createRule, isFileMatch } from '../utils'

function testIsAllow(
  globs: string[] | undefined,
  filename: string,
  source: string,
) {
  if (!Array.isArray(globs)) {
    return false // default doesn't allow any patterns
  }

  const filePath =
    // a node module
    source[0] !== '.' && source[0] !== '/'
      ? source
      : path.resolve(filename, '..', source) // get source absolute path

  return isFileMatch(filePath, globs)
}

type Options = {
  allow?: string[]
}

type MessageId = 'unassigned'

export = createRule<[Options?], MessageId>({
  name: 'no-unassigned-import',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Forbid unassigned imports.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          devDependencies: { type: ['boolean', 'array'] },
          optionalDependencies: { type: ['boolean', 'array'] },
          peerDependencies: { type: ['boolean', 'array'] },
          allow: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unassigned: 'Imported module should be assigned',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}

    const filename = context.physicalFilename

    const isAllow = (source: string) =>
      testIsAllow(options.allow, filename, source)

    return {
      ImportDeclaration(node) {
        if (node.specifiers.length === 0 && !isAllow(node.source.value)) {
          context.report({
            node,
            messageId: 'unassigned',
          })
        }
      },
      ExpressionStatement(node) {
        if (
          node.expression.type === 'CallExpression' &&
          isStaticRequire(node.expression) &&
          'value' in node.expression.arguments[0] &&
          typeof node.expression.arguments[0].value === 'string' &&
          !isAllow(node.expression.arguments[0].value)
        ) {
          context.report({
            node: node.expression,
            messageId: 'unassigned',
          })
        }
      },
    }
  },
})
