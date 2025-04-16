import { ESLintUtils } from '@typescript-eslint/utils'

import { docsUrl } from './docs-url.js'

export interface ImportXPluginDocs {
  /** The category the rule falls under */
  category?: string

  recommended?: true
}

export const createRule = ESLintUtils.RuleCreator<ImportXPluginDocs>(docsUrl)
