import type { PluginConfig } from '../types.js'

/**
 * adds platform extensions to Node resolver
 */
export default {
  settings: {
    'import-x/resolver': {
      node: {
        // Note: will not complain if only _one_ of these files exists.
        extensions: ['.js', '.web.js', '.ios.js', '.android.js'],
      },
    },
  },
} satisfies PluginConfig
