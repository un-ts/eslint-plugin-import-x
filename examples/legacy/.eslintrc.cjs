module.exports = {
  root: true,
  env: { es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:import-x/recommended',
    'plugin:import-x/react',
    'plugin:import-x/typescript',
  ],
  settings: {},
  ignorePatterns: ['.eslintrc.cjs', '**/exports-unused.ts'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['import-x'],
  rules: {
    'no-unused-vars': 'off',
    'import-x/no-dynamic-require': 'warn',
    'import-x/no-nodejs-modules': 'warn',
    'import-x/no-unused-modules': ['warn', { unusedExports: true }],
  },
};
