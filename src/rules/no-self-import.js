/**
 * @fileOverview Forbids a module from importing itself
 * @author Gio d'Amelio
 */

import { resolve } from '../utils/resolve'
import { moduleVisitor } from '../utils/module-visitor'
import { docsUrl } from '../docs-url'

function isImportingSelf(context, node, requireName) {
  const filePath = context.getPhysicalFilename
    ? context.getPhysicalFilename()
    : context.getFilename()

  // If the input is from stdin, this test can't fail
  if (filePath !== '<text>' && filePath === resolve(requireName, context)) {
    context.report({
      node,
      message: 'Module imports itself.',
    })
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description: 'Forbid a module from importing itself.',
      recommended: true,
      url: docsUrl('no-self-import'),
    },

    schema: [],
  },
  create(context) {
    return moduleVisitor(
      (source, node) => {
        isImportingSelf(context, node, source.value)
      },
      { commonjs: true },
    )
  },
}
