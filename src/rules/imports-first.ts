import { createRule } from '../utils'

import first from './first'

export = createRule({
  ...first,
  commitHash: '7b25c1cb95ee18acc1531002fd343e1e6031f9ed',
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
