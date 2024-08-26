import type { PluginFlatBaseConfig } from '../../types'

/**
 * Rules in progress.
 *
 * Do not expect these to adhere to semver across releases.
 */
export default {
  rules: {
    'import-x/no-deprecated': 1,
  },
} satisfies PluginFlatBaseConfig
