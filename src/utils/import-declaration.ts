import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types'

export const importDeclaration = (
  context: RuleContext,
  node: TSESTree.Node,
) => {
  const ancestors = context.sourceCode.getAncestors(node)
  return ancestors[ancestors.length - 1] as TSESTree.ImportDeclaration
}
