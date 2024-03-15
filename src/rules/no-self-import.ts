/**
 * Forbids a module from importing itself
 */

import { resolve } from '../utils/resolve'
import { moduleVisitor } from '../utils/module-visitor'
import { createRule } from '../utils'
import { RuleContext } from '../types'
import { TSESTree } from '@typescript-eslint/utils'

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
