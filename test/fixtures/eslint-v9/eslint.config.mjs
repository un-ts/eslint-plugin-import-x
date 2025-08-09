import { importX } from 'eslint-plugin-import-x'
import js from '@eslint/js'

export default [
  js.configs.recommended,
  importX.flatConfigs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    ignores: ['eslint.config.mjs', 'node_modules/*'],
    rules: {
      'no-unused-vars': 'off',
      'import-x/no-dynamic-require': 'warn',
      'import-x/no-nodejs-modules': 'warn',
      'import-x/no-unused-modules': ['warn', { unusedExports: true }],
      'import-x/no-cycle': 'warn',
    },
  },
]
