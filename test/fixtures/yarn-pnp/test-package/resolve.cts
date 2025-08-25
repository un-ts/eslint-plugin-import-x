import path from 'node:path'

import {
  defaultConditionNames,
  defaultExtensions,
  defaultExtensionAlias,
  defaultMainFields,
} from 'eslint-import-resolver-typescript'
import { ResolverFactory } from 'unrs-resolver'

const resolver = new ResolverFactory({
  conditionNames: defaultConditionNames,
  extensions: defaultExtensions,
  extensionAlias: defaultExtensionAlias,
  mainFields: defaultMainFields,
})

const eslintJsTypes = require.resolve('@eslint/js/types/index.d.ts')

console.log('eslintJs', eslintJsTypes)

console.log(resolver.sync(path.dirname(eslintJsTypes), 'eslint'))
