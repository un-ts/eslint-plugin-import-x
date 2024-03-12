module.exports = {
  root: true,
  plugins: ['eslint-plugin', 'import-x'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:eslint-plugin/recommended',
    'plugin:import-x/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    node: true,
    es6: true,
    es2017: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  rules: {
    '@typescript-eslint/no-var-requires': 'off',

    'eslint-plugin/consistent-output': ['error', 'always'],
    'eslint-plugin/meta-property-ordering': 'error',
    'eslint-plugin/no-deprecated-context-methods': 'error',
    'eslint-plugin/no-deprecated-report-api': 'off',
    'eslint-plugin/prefer-replace-text': 'error',
    'eslint-plugin/report-message-format': 'error',
    'eslint-plugin/require-meta-docs-description': [
      'error',
      { pattern: '^(Enforce|Ensure|Prefer|Forbid).+\\.$' },
    ],
    'eslint-plugin/require-meta-schema': 'error',
    'eslint-plugin/require-meta-type': 'error',

    // dog fooding
    'import-x/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['test/**'],
        optionalDependencies: false,
        peerDependencies: true,
        bundledDependencies: false,
      },
    ],
    'import-x/unambiguous': 'off',
  },

  settings: {
    'import-x/resolver': {
      node: {
        paths: ['src'],
      },
    },
  },

  overrides: [
    {
      files: ['src/**/*.ts'],
      settings: {
        'import-x/resolver': {
          typescript: true,
        },
      },
    },
    {
      files: 'test/**',
      env: {
        jest: true,
      },
      rules: {
        'import-x/default': 0,
      },
    },
  ],
}
