/**
 * Report modules that could parse incorrectly as scripts.
 */

import { createRule, isUnambiguousModule } from '../utils'

export = createRule({
  name: 'unambiguous',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Module systems',
      description:
        'Forbid potentially ambiguous parse goal (`script` vs. `module`).',
    },
    schema: [],
    messages: {
      module: 'This module could be parsed as a valid script.',
    },
  },
  defaultOptions: [],
  create(context) {
    // ignore non-modules
    if (context.parserOptions.sourceType !== 'module') {
      return {}
    }

    return {
      Program(ast) {
        if (!isUnambiguousModule(ast)) {
          context.report({
            node: ast,
            messageId: 'module',
          })
        }
      },
    }
  },
})
