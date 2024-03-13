import type { Rule } from 'eslint'

export const importDeclaration = (context: Rule.RuleContext) => {
  const ancestors = context.getAncestors()
  return ancestors[ancestors.length - 1]
}
