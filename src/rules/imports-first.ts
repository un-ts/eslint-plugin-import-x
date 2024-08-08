import { createRule } from '../utils'

import first from './first'

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
