import type { PluginConfig } from '../types'

/**
 * more opinionated config.
 */
export = {
  plugins: ['import-x'],
  rules: {
    'import-x/no-named-as-default': 1,
    'import-x/no-named-as-default-member': 1,
    'import-x/no-duplicates': 1,
  },
} satisfies PluginConfig
