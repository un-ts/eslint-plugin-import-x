/**
 * Rule to prefer ES6 to CJS
 */

import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

type NormalizedOptions = {
  allowPrimitiveModules?: boolean
  allowRequire?: boolean
  allowConditionalRequire?: boolean
}

type Options = 'allow-primitive-modules' | NormalizedOptions

type MessageId = 'export' | 'import'

function normalizeLegacyOptions(options: [Options?]): NormalizedOptions {
  if (options.includes('allow-primitive-modules')) {
    return { allowPrimitiveModules: true }
  }
  return (options[0] as NormalizedOptions) || {}
}

function allowPrimitive(
  node: TSESTree.MemberExpression,
  options: NormalizedOptions,
) {
  if (!options.allowPrimitiveModules) {
    return false
  }
  if (node.parent!.type !== 'AssignmentExpression') {
    return false
  }
  return node.parent!.right.type !== 'ObjectExpression'
}

function validateScope(scope: TSESLint.Scope.Scope) {
  return scope.variableScope.type === 'module'
}

// https://github.com/estree/estree/blob/HEAD/es5.md
function isConditional(node: TSESTree.Node) {
  if (
    node.type === 'IfStatement' ||
    node.type === 'TryStatement' ||
    node.type === 'LogicalExpression' ||
    node.type === 'ConditionalExpression'
  ) {
    return true
  }
  if (node.parent) {
    return isConditional(node.parent)
  }
  return false
}

function isLiteralString(node: TSESTree.CallExpressionArgument) {
  return (
    (node.type === 'Literal' && typeof node.value === 'string') ||
    (node.type === 'TemplateLiteral' && node.expressions.length === 0)
  )
}

export = createRule<[Options?], MessageId>({
  name: 'no-commonjs',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Module systems',
      description:
        'Forbid CommonJS `require` calls and `module.exports` or `exports.*`.',
    },
    schema: {
      anyOf: [
        {
          type: 'array',
          items: [
            {
              type: 'string',
              enum: ['allow-primitive-modules'],
            },
          ],
          additionalItems: false,
        },
        {
          type: 'array',
          items: [
            {
              type: 'object',
              properties: {
                allowPrimitiveModules: { type: 'boolean' },
                allowRequire: { type: 'boolean' },
                allowConditionalRequire: { type: 'boolean' },
              },
              additionalProperties: false,
            },
          ],
          additionalItems: false,
        },
      ],
    },
    messages: {
      export: 'Expected "export" or "export default"',
      import: 'Expected "import" instead of "require()"',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = normalizeLegacyOptions(context.options)

    return {
      MemberExpression(node) {
        // module.exports
        if (
          'name' in node.object &&
          node.object.name === 'module' &&
          'name' in node.property &&
          node.property.name === 'exports'
        ) {
          if (allowPrimitive(node, options)) {
            return
          }
          context.report({ node, messageId: 'export' })
        }

        // exports.
        if ('name' in node.object && node.object.name === 'exports') {
          const isInScope = context.sourceCode.getScope(node).variables.some(
            variable => variable.name === 'exports',
          )
          if (!isInScope) {
            context.report({ node, messageId: 'export' })
          }
        }
      },
      CallExpression(call) {
        if (!validateScope(context.sourceCode.getScope(call))) {
          return
        }

        if (call.callee.type !== 'Identifier') {
          return
        }
        if (call.callee.name !== 'require') {
          return
        }

        if (call.arguments.length !== 1) {
          return
        }
        if (!isLiteralString(call.arguments[0])) {
          return
        }

        if (options.allowRequire) {
          return
        }

        if (
          options.allowConditionalRequire !== false &&
          isConditional(call.parent!)
        ) {
          return
        }

        // keeping it simple: all 1-string-arg `require` calls are reported
        context.report({
          node: call.callee,
          messageId: 'import',
        })
      },
    }
  },
})
