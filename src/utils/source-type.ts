import type { TSESLint } from '@typescript-eslint/utils'

export function sourceType<
  MessageIds extends string,
  Options extends readonly unknown[],
>(context: TSESLint.RuleContext<MessageIds, Options>) {
  if ('languageOptions' in context && context.languageOptions) {
    if (
      'parserOptions' in context.languageOptions &&
      context.languageOptions.parserOptions?.sourceType
    ) {
      return context.languageOptions.parserOptions.sourceType
    }
    if (
      'sourceType' in context.languageOptions &&
      context.languageOptions.sourceType
    ) {
      return context.languageOptions.sourceType
    }
  }
  // For backwards compatibility with earlier ESLint versions without `languageOptions`.
  if ('parserOptions' in context && context.parserOptions) {
    return context.parserOptions.sourceType
  }
}
