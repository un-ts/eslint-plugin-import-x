/**
 * Forbids a module from importing itself
 */

import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types.js'
import { createRule, moduleVisitor, resolve } from '../utils/index.js'

type MessageId = 'self'

function isImportingSelf(
  context: RuleContext<MessageId>,
  node: TSESTree.Node,
  requireName: string,
) {
  const filename = context.physicalFilename

  // If the input is from stdin, this test can't fail
  if (filename !== '<text>' && filename === resolve(requireName, context)) {
    context.report({
      node,
      messageId: 'self',
    })
  }
}

export default createRule<[], MessageId>({
  name: 'no-self-import',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description: 'Forbid a module from importing itself.',
      recommended: true,
    },
    schema: [],
    messages: {
      self: 'Module imports itself.',
    },
  },
  defaultOptions: [],
  create(context) {
    return moduleVisitor(
      (source, node) => {
        isImportingSelf(context, node, source.value)
      },
      { commonjs: true },
    )
  },
})
