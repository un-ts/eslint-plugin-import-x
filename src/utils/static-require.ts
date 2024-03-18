import type { TSESTree } from '@typescript-eslint/utils'

// todo: merge with module visitor
export function isStaticRequire(node: TSESTree.CallExpression) {
  return (
    node &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'Literal' &&
    typeof node.arguments[0].value === 'string'
  )
}
