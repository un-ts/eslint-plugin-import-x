/**
 * Forbids a module from importing itself
 */
import type { TSESTree } from '@typescript-eslint/utils'

import type { RuleContext } from '../types'
import { createRule, moduleVisitor, resolve } from '../utils'

type MessageId = 'self'

function isImportingSelf(
  context: RuleContext<MessageId>,
  node: TSESTree.Node,
  requireName: string,
) {
  const filePath = context.getPhysicalFilename
    ? context.getPhysicalFilename()
    : context.getFilename()

  // If the input is from stdin, this test can't fail
  if (filePath !== '<text>' && filePath === resolve(requireName, context)) {
    context.report({
      node,
      messageId: 'self',
    })
  }
}

export = createRule<[], MessageId>({
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
