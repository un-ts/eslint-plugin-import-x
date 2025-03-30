import { createRule } from '../utils/index.js'

import first from './first.js'

export default createRule({
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
