import type { PluginConfig } from '../types.js'

/**
 * Rules in progress.
 *
 * Do not expect these to adhere to semver across releases.
 */
export default {
  plugins: ['import-x'],
  rules: {
    'import-x/no-deprecated': 1,
  },
} as PluginConfig
