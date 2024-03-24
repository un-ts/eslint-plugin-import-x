import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { getSourceCode } from 'eslint-compat-utils'

import type { RuleContext } from '../types'

export const getScope = (
  context: RuleContext,
  node: TSESTree.Node | TSESTree.Token,
) => {
  const sourceCode = getSourceCode(context)
  // @ts-expect-error - eslint v9
  return sourceCode.getScope(node) as TSESLint.Scope.Scope
}
