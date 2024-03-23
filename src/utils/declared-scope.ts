import { TSESTree, TSESLint } from '@typescript-eslint/utils'
import type { RuleContext } from '../types'

export function declaredScope(
  context: RuleContext,
  name: string,
  node: TSESTree.Node,
) {
  // For ESLint v9
  const scope: TSESLint.Scope.Scope = (context as any)?.sourceCode?.getScope
    ? (context as any).sourceCode.getScope(node)
    : context.getScope()

  const references = scope.references
  const reference = references.find(x => x.identifier.name === name)
  if (!reference || !reference.resolved) {
    return
  }
  return reference.resolved.scope.type
}
