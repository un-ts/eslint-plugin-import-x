import type { PluginConfig } from '../types.js'

/**
 * more opinionated config.
 */
export default {
  plugins: ['import-x'],
  rules: {
    'import-x/no-named-as-default': 1,
    'import-x/no-named-as-default-member': 1,
    'import-x/no-rename-default': 1,
    'import-x/no-duplicates': 1,
  },
} satisfies PluginConfig
