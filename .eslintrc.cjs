// ! This file is here for testing `no-unused-modules` rule for eslintrc

const { version } = require('eslint/package.json')

const noEslintrc = +version.split('.')[0] > 8

const testCompiled = process.env.TEST_COMPILED === '1'

/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:eslint-plugin/recommended',
    testCompiled && 'plugin:import-x/recommended',
    'plugin:json/recommended-legacy',
    'plugin:mdx/recommended',
    'plugin:n/recommended',
    !noEslintrc && 'plugin:unicorn/recommended',
    'plugin:yml/standard',
    'plugin:yml/prettier',
    'plugin:prettier/recommended',
  ].filter(Boolean),
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
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-require-imports': 'off',

    'no-constant-condition': noEslintrc ? 'error' : 'off',

    'eslint-plugin/consistent-output': ['error', 'always'],
    'eslint-plugin/meta-property-ordering': 'error',
    'eslint-plugin/no-deprecated-context-methods': 'error',
    'eslint-plugin/no-deprecated-report-api': 'off',
    'eslint-plugin/prefer-replace-text': 'error',
    'eslint-plugin/report-message-format': 'error',
    'eslint-plugin/require-meta-docs-description': [
      'error',
      { pattern: String.raw`^(Enforce|Ensure|Prefer|Forbid).+\.$` },
    ],
    'eslint-plugin/require-meta-schema': 'error',
    'eslint-plugin/require-meta-type': 'error',
    'n/no-extraneous-require': 'off',
    'n/no-missing-import': 'off',
    'n/no-missing-require': 'off',
    'n/no-unsupported-features/es-syntax': 'off',
    ...(noEslintrc || {
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [String.raw`^(CONTRIBUTING|README)\.md$`],
        },
      ],
    }),
    'unicorn/no-array-callback-reference': 'off',
    'unicorn/no-array-reduce': 'off',
    'unicorn/no-null': 'off',
    'unicorn/prefer-module': 'off',
    'unicorn/prevent-abbreviations': 'off',
    'unicorn/prefer-at': 'off',
    'unicorn/prefer-export-from': ['error', { ignoreUsedVariables: true }],

    // dog fooding
    ...(testCompiled && {
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
    }),
  },

  overrides: [
    {
      files: ['*.ts'],
      excludedFiles: ['test/fixtures'],
      rules: {
        '@typescript-eslint/array-type': [
          2,
          {
            default: 'array-simple',
          },
        ],
        '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            fixStyle: 'inline-type-imports',
          },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
        ...(testCompiled && {
          'import-x/consistent-type-specifier-style': 'error',
          'import-x/order': [
            'error',
            {
              alphabetize: {
                order: 'asc',
              },
              'newlines-between': 'always',
            },
          ],
        }),
      },
      settings: {
        'import-x/resolver': {
          typescript: {
            project: 'tsconfig.base.json',
          },
        },
      },
    },
    {
      files: 'test/**',
      env: {
        jest: true,
      },
    },
    {
      files: 'global.d.ts',
      rules: {
        'import-x/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: 'README.md',
      rules: {
        // https://github.com/bmish/eslint-doc-generator/issues/655
        'no-irregular-whitespace': 'off',
      },
    },
  ],
}
