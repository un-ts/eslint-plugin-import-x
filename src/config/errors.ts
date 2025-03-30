import type { PluginConfig } from '../types.js'

/**
 * unopinionated config. just the things that are necessarily runtime errors
 * waiting to happen.
 */
export default {
  plugins: ['import-x'],
  rules: {
    'import-x/no-unresolved': 2,
    'import-x/named': 2,
    'import-x/namespace': 2,
    'import-x/default': 2,
    'import-x/export': 2,
  },
} satisfies PluginConfig
