import { AST_NODE_TYPES } from '@typescript-eslint/types'
import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'

export const importDeclaration = (
  context: RuleContext,
  node: TSESTree.ImportDefaultSpecifier,
) => {
  if (node.parent && node.parent.type === AST_NODE_TYPES.ImportDeclaration) {
    return node.parent
  }
  const ancestors = context.sourceCode.getAncestors(node)
  return ancestors[ancestors.length - 1] as TSESTree.ImportDeclaration
}
