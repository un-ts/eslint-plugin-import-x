import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types'

export const getScope = (context: RuleContext, node: TSESTree.Node) =>
  context.sourceCode.getScope(node)
