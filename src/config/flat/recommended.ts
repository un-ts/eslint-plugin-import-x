import type { PluginFlatBaseConfig } from '../../types.js'

/** The basics. */
export default {
  rules: {
    // analysis/correctness
    'import-x/no-unresolved': 'error',
    'import-x/named': 'error',
    'import-x/namespace': 'error',
    'import-x/default': 'error',
    'import-x/export': 'error',

    // red flags (thus, warnings)
    'import-x/no-named-as-default': 'warn',
    'import-x/no-named-as-default-member': 'warn',
    'import-x/no-duplicates': 'warn',
  },
} satisfies PluginFlatBaseConfig
