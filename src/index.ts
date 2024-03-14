import type { TSESLint } from '@typescript-eslint/utils'

import type { PluginConfig } from './types'

import noUnresolved from './rules/no-unresolved'
import named from './rules/named'
import default_ from './rules/default'
import namespace from './rules/namespace'
import noNamespace from './rules/no-namespace'
import export_ from './rules/export'
import noMutableExports from './rules/no-mutable-exports'
import extensions from './rules/extensions'
import noRestrictedPaths from './rules/no-restricted-paths'
import noInternalModules from './rules/no-internal-modules'

export const rules = {
  'no-unresolved': noUnresolved,
  named,
  default: default_,
  namespace,
  'no-namespace': noNamespace,
  export: export_,
  'no-mutable-exports': noMutableExports,
  extensions,
  'no-restricted-paths': noRestrictedPaths,
  'no-internal-modules': noInternalModules,
  'group-exports': require('./rules/group-exports'),
  'no-relative-packages': require('./rules/no-relative-packages'),
  'no-relative-parent-imports': require('./rules/no-relative-parent-imports'),
  'consistent-type-specifier-style': require('./rules/consistent-type-specifier-style'),

  'no-self-import': require('./rules/no-self-import'),
  'no-cycle': require('./rules/no-cycle'),
  'no-named-default': require('./rules/no-named-default'),
  'no-named-as-default': require('./rules/no-named-as-default'),
  'no-named-as-default-member': require('./rules/no-named-as-default-member'),
  'no-anonymous-default-export': require('./rules/no-anonymous-default-export'),
  'no-unused-modules': require('./rules/no-unused-modules'),

  'no-commonjs': require('./rules/no-commonjs'),
  'no-amd': require('./rules/no-amd'),
  'no-duplicates': require('./rules/no-duplicates'),
  first: require('./rules/first'),
  'max-dependencies': require('./rules/max-dependencies'),
  'no-extraneous-dependencies': require('./rules/no-extraneous-dependencies'),
  'no-absolute-path': require('./rules/no-absolute-path'),
  'no-nodejs-modules': require('./rules/no-nodejs-modules'),
  'no-webpack-loader-syntax': require('./rules/no-webpack-loader-syntax'),
  order: require('./rules/order'),
  'newline-after-import': require('./rules/newline-after-import'),
  'prefer-default-export': require('./rules/prefer-default-export'),
  'no-default-export': require('./rules/no-default-export'),
  'no-named-export': require('./rules/no-named-export'),
  'no-dynamic-require': require('./rules/no-dynamic-require'),
  unambiguous: require('./rules/unambiguous'),
  'no-unassigned-import': require('./rules/no-unassigned-import'),
  'no-useless-path-segments': require('./rules/no-useless-path-segments'),
  'dynamic-import-chunkname': require('./rules/dynamic-import-chunkname'),
  'no-import-module-exports': require('./rules/no-import-module-exports'),
  'no-empty-named-blocks': require('./rules/no-empty-named-blocks'),

  // export
  'exports-last': require('./rules/exports-last'),

  // metadata-based
  'no-deprecated': require('./rules/no-deprecated'),

  // deprecated aliases to rules
  'imports-first': require('./rules/imports-first'),
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>

export const configs = {
  recommended: require('./config/recommended'),

  errors: require('./config/errors'),
  warnings: require('./config/warnings'),

  // shhhh... work in progress "secret" rules
  'stage-0': require('./config/stage-0'),

  // useful stuff for folks using various environments
  react: require('./config/react'),
  'react-native': require('./config/react-native'),
  electron: require('./config/electron'),
  typescript: require('./config/typescript'),
} satisfies Record<string, PluginConfig>
