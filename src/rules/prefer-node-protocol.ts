import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { createRule, importType, moduleVisitor } from '../utils'

export = createRule({
  name: 'prefer-node-protocol',
  meta: {
    type: 'problem',
    docs: {
      category: 'Style guide',
      description:
        "When importing builtin modules, it's better to use the node: protocol.",
    },
    schema: [],
    messages: {
      preferNode: 'Prefer `node:{{moduleName}}` over `{{moduleName}}`.',
    },
  },
  defaultOptions: [],
  create(context) {
    return moduleVisitor(
      (source, node) => {
        const moduleName = source.value
        if (
          importType(moduleName, context) === 'builtin' &&
          !(moduleName.startsWith('node:') || /^bun(?::|$)/.test(moduleName))
        ) {
          context.report({
            node,
            messageId: 'preferNode',
            data: {
              moduleName,
            },
            fix: fixer => replaceStringLiteral(fixer, node, 'node:', 0, 0),
          })
        }
      },
      { commonjs: true },
    )
  },
})

function replaceStringLiteral(
  fixer: TSESLint.RuleFixer,
  node:
    | TSESTree.StringLiteral
    | TSESTree.ImportDeclaration
    | TSESTree.ExportNamedDeclaration
    | TSESTree.ExportAllDeclaration
    | TSESTree.CallExpression
    | TSESTree.ImportExpression,
  text: string,
  relativeRangeStart: number,
  relativeRangeEnd: number,
) {
  const firstCharacterIndex = node.range[0] + 1
  const start = Number.isInteger(relativeRangeEnd)
    ? relativeRangeStart + firstCharacterIndex
    : firstCharacterIndex
  const end = Number.isInteger(relativeRangeEnd)
    ? relativeRangeEnd + firstCharacterIndex
    : node.range[1] - 1

  return fixer.replaceTextRange([start, end], text)
}
