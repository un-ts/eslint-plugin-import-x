import type { PluginConfig } from '../types'

/**
 * Adds `.jsx` as an extension, and enables JSX parsing.
 *
 * Even if _you_ aren't using JSX (or .jsx) directly, if your dependencies
 * define jsnext:main and have JSX internally, you may run into problems
 * if you don't enable these settings at the top level.
 */
export = {
  settings: {
    'import-x/extensions': ['.js', '.jsx'],
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
} satisfies PluginConfig
