import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types'

export const getAncestors = (context: RuleContext, node: TSESTree.Node) =>
  context.sourceCode.getAncestors(node)
