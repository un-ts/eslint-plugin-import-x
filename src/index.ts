import type { TSESLint } from '@typescript-eslint/utils'

import type { PluginConfig } from './types'

// rules
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
import groupExports from './rules/group-exports'
import noRelativePackages from './rules/no-relative-packages'
import noRelativeParentImports from './rules/no-relative-parent-imports'
import consistentTypeSpecifierStyle from './rules/consistent-type-specifier-style'
import noSelfImport from './rules/no-self-import'
import noCycle from './rules/no-cycle'
import noNamedDefault from './rules/no-named-default'
import noNamedAsDefault from './rules/no-named-as-default'
import noNamedAsDefaultMember from './rules/no-named-as-default-member'
import noAnonymousDefaultExport from './rules/no-anonymous-default-export'
import noUnusedModules from './rules/no-unused-modules'

// configs
import recommended from './config/recommended'
import errors from './config/errors'
import warnings from './config/warnings'
import stage0 from './config/stage-0'
import react from './config/react'
import reactNative from './config/react-native'
import electron from './config/electron'
import typescript from './config/typescript'

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
  'group-exports': groupExports,
  'no-relative-packages': noRelativePackages,
  'no-relative-parent-imports': noRelativeParentImports,
  'consistent-type-specifier-style': consistentTypeSpecifierStyle,

  'no-self-import': noSelfImport,
  'no-cycle': noCycle,
  'no-named-default': noNamedDefault,
  'no-named-as-default': noNamedAsDefault,
  'no-named-as-default-member': noNamedAsDefaultMember,
  'no-anonymous-default-export': noAnonymousDefaultExport,
  'no-unused-modules': noUnusedModules,

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
  recommended,

  errors,
  warnings,

  // shhhh... work in progress "secret" rules
  'stage-0': stage0,

  // useful stuff for folks using various environments
  react,
  'react-native': reactNative,
  electron,
  typescript,
} satisfies Record<string, PluginConfig>
