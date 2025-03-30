import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'

export function declaredScope(
  context: RuleContext,
  node: TSESTree.Node,
  name: string,
) {
  const references = context.sourceCode.getScope(node).references
  const reference = references.find(x => x.identifier.name === name)
  return reference?.resolved?.scope.type
}
