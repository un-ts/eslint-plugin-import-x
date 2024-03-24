import type { TSESTree } from '@typescript-eslint/utils'
import { getSourceCode } from 'eslint-compat-utils'

import type { RuleContext } from '../types'

export const getAncestors = (
  context: RuleContext,
  node: TSESTree.Node | TSESTree.Token,
) => {
  const sourceCode = getSourceCode(context)
  // @ts-expect-error - eslint v9
  return sourceCode.getAncestors(node) as TSESTree.Node[]
}
