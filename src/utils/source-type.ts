import type { RuleContext } from '../types'

export default function sourceType(context: RuleContext) {
  if ('languageOptions' in context && context.languageOptions) {
    if ('sourceType' in context.languageOptions) {
      return context.languageOptions.sourceType
    }
    if ('parserOptions' in context.languageOptions && context.languageOptions.parserOptions) {
      if ('sourceType' in context.languageOptions.parserOptions) {
        return context.languageOptions.parserOptions.sourceType
      }
    }
    return context.languageOptions.sourceType
  }
  if ('sourceType' in context.parserOptions) {
    return context.parserOptions.sourceType
  }
}
