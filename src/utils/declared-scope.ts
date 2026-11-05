import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'

export function declaredScope(
  context: RuleContext,
  identifier: TSESTree.Identifier,
) {
  // Look up the reference for this exact identifier: another reference with
  // the same name in this scope (e.g. a type annotation that names the module
  // namespace) can resolve to a different variable. Walk up because a reference
  // can be recorded in an enclosing scope (e.g. a decorator expression).
  let scope: ReturnType<typeof context.sourceCode.getScope> | null =
    context.sourceCode.getScope(identifier)
  while (scope !== null) {
    const reference = scope.references.find(x => x.identifier === identifier)
    if (reference !== undefined) return reference.resolved?.scope.type
    scope = scope.upper
  }
  return
}
