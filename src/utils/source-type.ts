import type { RuleContext } from '../types'

export default function sourceType(context: RuleContext) {
  if ('languageOptions' in context && context.languageOptions) {
    if (
      'parserOptions' in context.languageOptions &&
      context.languageOptions.parserOptions &&
      'sourceType' in context.languageOptions.parserOptions
    ) {
      return context.languageOptions.parserOptions.sourceType
    }
    if ('sourceType' in context.languageOptions) {
      return context.languageOptions.sourceType
    }
  }
  if ('sourceType' in context.parserOptions) {
    return context.parserOptions.sourceType
  }
}
