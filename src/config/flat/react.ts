import type { PluginFlatBaseConfig } from '../../types.js'

/**
 * Adds `.jsx` as an extension, and enables JSX parsing.
 *
 * Even if _you_ aren't using JSX (or .jsx) directly, if your dependencies
 * define jsnext:main and have JSX internally, you may run into problems
 * if you don't enable these settings at the top level.
 */
export default {
  settings: {
    'import-x/extensions': ['.js', '.jsx', '.mjs', '.cjs'],
  },
  languageOptions: {
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
} satisfies PluginFlatBaseConfig
