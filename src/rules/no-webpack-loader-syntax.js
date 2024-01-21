import docsUrl from '../docsUrl'

import moduleVisitor from 'eslint-module-utils/moduleVisitor'

function reportIfNonStandard(context, node, name) {
  if (name && name.includes('!')) {
    context.report(
      node,
      `Unexpected '!' in '${name}'. Do not use import syntax to configure webpack loaders.`,
    )
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description: 'Forbid webpack loader syntax in imports.',
      url: docsUrl('no-webpack-loader-syntax'),
    },
    schema: [],
  },

  create(context) {
    return moduleVisitor(
      (source, node) => {
        reportIfNonStandard(context, node, source.value)
      },
      { commonjs: true },
    )
  },
}
