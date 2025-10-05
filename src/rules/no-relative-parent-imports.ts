import path from 'node:path'

import type { ModuleOptions } from '../utils/index.js'
import {
  importType,
  createRule,
  moduleVisitor,
  makeOptionsSchema,
  resolve,
} from '../utils/index.js'

type MessageId = 'noAllowed'

export default createRule<[ModuleOptions?], MessageId>({
  name: 'no-relative-parent-imports',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description: 'Forbid importing modules from parent directories.',
    },
    schema: [makeOptionsSchema()],
    messages: {
      noAllowed:
        "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `{{filename}}` to same directory as `{{depPath}}` or consider making `{{depPath}}` a package.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.physicalFilename

    if (filename === '<text>') {
      return {}
    } // can't check a non-file

    return moduleVisitor(sourceNode => {
      const depPath = sourceNode.value

      if (importType(depPath, context) === 'external') {
        // ignore packages
        return
      }

      const absDepPath = resolve(depPath, context)

      if (!absDepPath) {
        // unable to resolve path
        return
      }

      const relDepPath = path.relative(path.dirname(filename), absDepPath)

      if (importType(relDepPath, context) === 'parent') {
        context.report({
          node: sourceNode,
          messageId: 'noAllowed',
          data: {
            filename: path.basename(filename),
            depPath,
          },
        })
      }
    }, context.options[0])
  },
})
