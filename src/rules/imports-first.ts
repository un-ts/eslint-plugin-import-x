import { ESLintUtils } from '@typescript-eslint/utils'

import { docsUrl } from '../docs-url'

import first from './first'

const createRule = ESLintUtils.RuleCreator(ruleName =>
  docsUrl(ruleName, '7b25c1cb95ee18acc1531002fd343e1e6031f9ed'),
)

export = createRule({
  ...first,
  name: 'imports-first',
  meta: {
    ...first.meta,
    deprecated: true,
    docs: {
      category: 'Style guide',
      description: 'Replaced by `import-x/first`.',
    },
  },
})
