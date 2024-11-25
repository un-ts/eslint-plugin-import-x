import type { ScopeType } from '@typescript-eslint/scope-manager'
import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types'

export function declaredScope(
  context: RuleContext,
  node: TSESTree.Node,
  name: string,
): ScopeType | undefined {
  const references = context.sourceCode.getScope(node).references
  const reference = references.find(x => x.identifier.name === name)
  if (!reference || !reference.resolved) {
    return
  }
  return reference.resolved.scope.type
}
