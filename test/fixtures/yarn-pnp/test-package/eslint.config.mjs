import js from '@eslint/js'
import { importX } from 'eslint-plugin-import-x'
import * as tsParser from '@typescript-eslint/parser'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

export default [
  globalIgnores(['.pnp.cjs', '.yarn']),
  js.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'warn',
    },
  },
]
