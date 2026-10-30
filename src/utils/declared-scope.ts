import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'

export function declaredScope(
  context: RuleContext,
  node: TSESTree.Node,
  name: string,
) {
  let scope: ReturnType<typeof context.sourceCode.getScope> | null =
    context.sourceCode.getScope(node)
  while (scope !== null) {
    const reference = scope.references.find(x => x.identifier.name === name)
    if (reference !== undefined) return reference.resolved?.scope.type
    scope = scope.upper
  }
  return
}
