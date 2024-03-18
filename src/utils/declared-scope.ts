import type { RuleContext } from '../types'

export function declaredScope(context: RuleContext, name: string) {
  const references = context.getScope().references
  const reference = references.find(x => x.identifier.name === name)
  if (!reference || !reference.resolved) {
    return
  }
  return reference.resolved.scope.type
}
