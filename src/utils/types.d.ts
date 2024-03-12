import type { Rule } from 'eslint'

export type Extension = `.${string}`

export type ESLintSettings = NonNullable<Rule.RuleContext['settings']> & {
  'import-x/extensions'?: Extension[]
  'import-x/parsers'?: { [k: string]: Extension[] }
  'import-x/cache'?: { lifetime: number | '∞' | 'Infinity' }
}
