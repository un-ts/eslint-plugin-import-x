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
import noCommonjs from './rules/no-commonjs'
import noAmd from './rules/no-amd'
import noDuplicates from './rules/no-duplicates'
import first from './rules/first'
import maxDependencies from './rules/max-dependencies'
import noExtraneousDependencies from './rules/no-extraneous-dependencies'
import noAbsolutePath from './rules/no-absolute-path'
import noNodejsModules from './rules/no-nodejs-modules'
import noWebpackLoaderSyntax from './rules/no-webpack-loader-syntax'
import order from './rules/order'
import newlineAfterImport from './rules/newline-after-import'
import preferDefaultExport from './rules/prefer-default-export'
import noDefaultExport from './rules/no-default-export'
import noNamedExport from './rules/no-named-export'
import noDynamicRequire from './rules/no-dynamic-require'
import unambiguous from './rules/unambiguous'
import noUnassignedImport from './rules/no-unassigned-import'
import noUselessPathSegments from './rules/no-useless-path-segments'
import dynamicImportChunkname from './rules/dynamic-import-chunkname'
import noImportModuleExports from './rules/no-import-module-exports'

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

  'no-commonjs': noCommonjs,
  'no-amd': noAmd,
  'no-duplicates': noDuplicates,
  first,
  'max-dependencies': maxDependencies,
  'no-extraneous-dependencies': noExtraneousDependencies,
  'no-absolute-path': noAbsolutePath,
  'no-nodejs-modules': noNodejsModules,
  'no-webpack-loader-syntax': noWebpackLoaderSyntax,
  order,
  'newline-after-import': newlineAfterImport,
  'prefer-default-export': preferDefaultExport,
  'no-default-export': noDefaultExport,
  'no-named-export': noNamedExport,
  'no-dynamic-require': noDynamicRequire,
  unambiguous,
  'no-unassigned-import': noUnassignedImport,
  'no-useless-path-segments': noUselessPathSegments,
  'dynamic-import-chunkname': dynamicImportChunkname,
  'no-import-module-exports': noImportModuleExports,
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
