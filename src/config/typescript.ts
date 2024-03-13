import type { PluginConfig } from '../types'

/**
 * This config:
 * 1) adds `.jsx`, `.ts`, `.cts`, `.mts`, and `.tsx` as an extension
 * 2) enables JSX/TSX parsing
 */

// Omit `.d.ts` because 1) TypeScript compilation already confirms that
// types are resolved, and 2) it would mask an unresolved
// `.ts`/`.tsx`/`.js`/`.jsx` implementation.
const typeScriptExtensions = ['.ts', '.tsx'] as const

const allExtensions = [...typeScriptExtensions, '.js', '.jsx'] as const

export = {
  settings: {
    'import-x/extensions': allExtensions,
    'import-x/external-module-folders': ['node_modules', 'node_modules/@types'],
    'import-x/parsers': {
      '@typescript-eslint/parser': [...typeScriptExtensions, '.cts', '.mts'],
    },
    'import-x/resolver': {
      node: {
        extensions: allExtensions,
      },
    },
  },
  rules: {
    // analysis/correctness

    // TypeScript compilation already ensures that named imports exist in the referenced module
    'import-x/named': 'off',
  },
} satisfies PluginConfig
