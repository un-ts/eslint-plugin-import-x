import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types'

import { getAncestors } from './get-ancestors'

export const importDeclaration = (
  context: RuleContext,
  node: TSESTree.Node,
) => {
  const ancestors = getAncestors(context, node)
  return ancestors[ancestors.length - 1] as TSESTree.ImportDeclaration
}
