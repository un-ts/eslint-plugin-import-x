import { foo } from './foo'

export { foo as AliasFirst }
export type AliasFirst = number

export type TypeFirst = number
export { foo as TypeFirst }
