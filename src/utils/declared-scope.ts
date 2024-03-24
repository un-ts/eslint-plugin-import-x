import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types'

import { getScope } from './get-scope'

export function declaredScope(
  context: RuleContext,
  node: TSESTree.Node,
  name: string,
) {
  const references = getScope(context, node).references
  const reference = references.find(x => x.identifier.name === name)
  if (!reference || !reference.resolved) {
    return
  }
  return reference.resolved.scope.type
}
