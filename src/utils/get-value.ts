import { TSESTree } from '@typescript-eslint/utils'

export const getValue = (
  node: TSESTree.Identifier | TSESTree.StringLiteral,
) => {
  switch (node.type) {
    case TSESTree.AST_NODE_TYPES.Identifier: {
      return node.name
    }
    case TSESTree.AST_NODE_TYPES.Literal: {
      return node.value
    }
    default: {
      throw new Error(`Unsupported node type: ${(node as TSESTree.Node).type}`)
    }
  }
}
