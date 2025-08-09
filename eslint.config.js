// @ts-check

import { cjsRequire } from '@pkgr/core'
import { config, configs } from 'typescript-eslint'
import js from '@eslint/js'
import eslintPlugin from 'eslint-plugin-eslint-plugin'
import { flatConfigs } from 'eslint-plugin-import-x'
import json from 'eslint-plugin-json'
import * as mdx from 'eslint-plugin-mdx'
import n from 'eslint-plugin-n'
import unicorn from 'eslint-plugin-unicorn'
import yml from 'eslint-plugin-yml'
import prettier from 'eslint-plugin-prettier/recommended'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import globals from 'globals'

const { version } = cjsRequire('eslint/package.json')

const noEslintrc = +version.split('.')[0] > 8

export default config(
  {
    ignores: [
      '.yarn',
      'lib',
      'coverage',
      'test/fixtures',
      'CHANGELOG.md',
      '!.*.js',
    ],
  },
  js.configs.recommended,
  configs.recommended,
  flatConfigs.recommended,
  flatConfigs.typescript,
  json.configs.recommended,
  mdx.configs.flat,
  mdx.configs.flatCodeBlocks,
  n.configs['flat/recommended'],
  unicorn.configs['flat/recommended'],
  yml.configs['flat/standard'],
  yml.configs['flat/prettier'],
  prettier,
  {
    plugins: {
      'eslint-plugin': eslintPlugin,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: 'tsconfig.base.json',
        }),
      ],
    },
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
      },
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
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [String.raw`^(CONTRIBUTING|README)\.md$`],
        },
      ],
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/prefer-at': 'off',
      'unicorn/prefer-export-from': ['error', { ignoreUsedVariables: true }],

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
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/array-type': [
        2,
        {
          default: 'array-simple',
        },
      ],
      '@typescript-eslint/consistent-type-definitions': 'error',
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
    },
  },
  {
    files: [
      'test/**/*',
      '.*.js',
      '**/*.d.ts',
      '**/.eslintrc.js',
      'test.local.*',
      'eslint.config.js',
      'jest.config.ts',
    ],
    rules: {
      'import-x/no-extraneous-dependencies': 'off',
      'n/no-extraneous-import': 'off',
    },
  },
  {
    files: ['**/*.{cjs,cts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['global.d.ts'],
    rules: {
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['README.md'],
    rules: {
      // https://github.com/bmish/eslint-doc-generator/issues/655
      'no-irregular-whitespace': 'off',
    },
  },
)
