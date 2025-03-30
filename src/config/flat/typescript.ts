import type { PluginFlatBaseConfig } from '../../types.js'

/**
 * This config:
 * 1) adds `.jsx`, `.ts`, `.cts`, `.mts`, and `.tsx` as an extension
 * 2) enables JSX/TSX parsing
 */

// Omit `.d.ts` because 1) TypeScript compilation already confirms that
// types are resolved, and 2) it would mask an unresolved
// `.ts`/`.tsx`/`.js`/`.jsx` implementation.
const typeScriptExtensions = ['.ts', '.tsx', '.cts', '.mts'] as const

const allExtensions = [
  ...typeScriptExtensions,
  '.js',
  '.jsx',
  '.cjs',
  '.mjs',
] as const

export default {
  settings: {
    'import-x/extensions': allExtensions,
    'import-x/external-module-folders': ['node_modules', 'node_modules/@types'],
    'import-x/parsers': {
      '@typescript-eslint/parser': [...typeScriptExtensions],
    },
    'import-x/resolver': {
      typescript: true,
    },
  },
  rules: {
    // analysis/correctness

    // TypeScript compilation already ensures that named imports exist in the referenced module
    'import-x/named': 'off',
  },
} satisfies PluginFlatBaseConfig
