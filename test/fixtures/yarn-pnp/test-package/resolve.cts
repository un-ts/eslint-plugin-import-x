import path from 'node:path'
import {
  defaultConditionNames,
  defaultExtensionAlias,
  defaultExtensions,
  defaultMainFields,
  resolve,
} from 'eslint-import-resolver-typescript'
import { ResolverFactory } from 'unrs-resolver'

const eslintJsTypes = require.resolve('@eslint/js/types/index.d.ts')

console.log('eslintJs', eslintJsTypes)

console.log(resolve('eslint', eslintJsTypes))

const resolver = new ResolverFactory({
  conditionNames: defaultConditionNames,
  extensions: defaultExtensions,
  extensionAlias: defaultExtensionAlias,
  mainFields: defaultMainFields,
})

console.log(resolver.sync(path.dirname(eslintJsTypes), 'eslint'))
