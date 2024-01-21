import path from 'path'

import importType from '../core/importType'
import docsUrl from '../docsUrl'

import moduleVisitor, {
  makeOptionsSchema,
} from 'eslint-module-utils/moduleVisitor'
import resolve from 'eslint-module-utils/resolve'

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description: 'Forbid importing modules from parent directories.',
      url: docsUrl('no-relative-parent-imports'),
    },
    schema: [makeOptionsSchema()],
  },

  create: function noRelativePackages(context) {
    const myPath = context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename()
    if (myPath === '<text>') {
      return {}
    } // can't check a non-file

    function checkSourceValue(sourceNode) {
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

      const relDepPath = path.relative(path.dirname(myPath), absDepPath)

      if (importType(relDepPath, context) === 'parent') {
        context.report({
          node: sourceNode,
          message: `Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move \`${path.basename(myPath)}\` to same directory as \`${depPath}\` or consider making \`${depPath}\` a package.`,
        })
      }
    }

    return moduleVisitor(checkSourceValue, context.options[0])
  },
}
