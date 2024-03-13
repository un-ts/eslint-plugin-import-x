import { ESLintUtils } from '@typescript-eslint/utils'

import { docsUrl } from '../docs-url'

export const createRule = ESLintUtils.RuleCreator(docsUrl)
