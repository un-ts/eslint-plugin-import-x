/**
 * - adds platform extensions to Node resolver
 */
module.exports = {
  settings: {
    'import-x/resolver': {
      node: {
        // Note: will not complain if only _one_ of these files exists.
        extensions: ['.js', '.web.js', '.ios.js', '.android.js'],
      },
    },
  },
}
