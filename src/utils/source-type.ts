import type { RuleContext } from '../types'

export default function sourceType(context: RuleContext) {
  if ('sourceType' in context.parserOptions) {
    return context.parserOptions.sourceType
  }
  if ('languageOptions' in context && context.languageOptions) {
    return context.languageOptions.sourceType
  }
}
