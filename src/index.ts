// rules
import electron from './config/electron'
import errors from './config/errors'
import react from './config/react'
import reactNative from './config/react-native'
import recommended from './config/recommended'
import stage0 from './config/stage-0'
import typescript from './config/typescript'
import warnings from './config/warnings'
import consistentTypeSpecifierStyle from './rules/consistent-type-specifier-style'
import default_ from './rules/default'
import dynamicImportChunkname from './rules/dynamic-import-chunkname'
import export_ from './rules/export'
import exportsLast from './rules/exports-last'
import extensions from './rules/extensions'
import first from './rules/first'
import groupExports from './rules/group-exports'
import importsFirst from './rules/imports-first'
import maxDependencies from './rules/max-dependencies'
import named from './rules/named'
import namespace from './rules/namespace'
import newlineAfterImport from './rules/newline-after-import'
import noAbsolutePath from './rules/no-absolute-path'
import noAmd from './rules/no-amd'
import noAnonymousDefaultExport from './rules/no-anonymous-default-export'
import noCommonjs from './rules/no-commonjs'
import noCycle from './rules/no-cycle'
import noDefaultExport from './rules/no-default-export'
import noDeprecated from './rules/no-deprecated'
import noDuplicates from './rules/no-duplicates'
import noDynamicRequire from './rules/no-dynamic-require'
import noEmptyNamedBlocks from './rules/no-empty-named-blocks'
import noExtraneousDependencies from './rules/no-extraneous-dependencies'
import noImportModuleExports from './rules/no-import-module-exports'
import noInternalModules from './rules/no-internal-modules'
import noMutableExports from './rules/no-mutable-exports'
import noNamedAsDefault from './rules/no-named-as-default'
import noNamedAsDefaultMember from './rules/no-named-as-default-member'
import noNamedDefault from './rules/no-named-default'
import noNamedExport from './rules/no-named-export'
import noNamespace from './rules/no-namespace'
import noNodejsModules from './rules/no-nodejs-modules'
import noRelativePackages from './rules/no-relative-packages'
import noRelativeParentImports from './rules/no-relative-parent-imports'
import noRestrictedPaths from './rules/no-restricted-paths'
import noSelfImport from './rules/no-self-import'
import noUnassignedImport from './rules/no-unassigned-import'
import noUnresolved from './rules/no-unresolved'
import noUnusedModules from './rules/no-unused-modules'
import noUselessPathSegments from './rules/no-useless-path-segments'
import noWebpackLoaderSyntax from './rules/no-webpack-loader-syntax'
import order from './rules/order'
import preferDefaultExport from './rules/prefer-default-export'
import unambiguous from './rules/unambiguous'
// configs
import type { PluginConfig } from './types'
import type { RuleModuleWithCustomMeta } from './utils'

const configs = {
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

const rules = {
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
  'no-empty-named-blocks': noEmptyNamedBlocks,

  // export
  'exports-last': exportsLast,

  // metadata-based
  'no-deprecated': noDeprecated,

  // deprecated aliases to rules
  'imports-first': importsFirst,
} satisfies Record<string, RuleModuleWithCustomMeta<string, readonly unknown[]>>

export = {
  configs,
  rules,
}
