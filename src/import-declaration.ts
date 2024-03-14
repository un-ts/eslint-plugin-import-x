import { TSESTree } from '@typescript-eslint/utils'

import { RuleContext } from './types'

export const importDeclaration = (context: RuleContext) => {
  const ancestors = context.getAncestors()
  return ancestors[ancestors.length - 1] as TSESTree.ImportDeclaration
}
