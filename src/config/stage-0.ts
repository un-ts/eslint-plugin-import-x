import type { PluginConfig } from '../types'

/**
 * Rules in progress.
 *
 * Do not expect these to adhere to semver across releases.
 */
export = {
  plugins: ['import-x'],
  rules: {
    'import-x/no-deprecated': 1,
  },
} as PluginConfig
