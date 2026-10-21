import type { T } from './mixed'

export namespace NamespaceFirst {
  export const a = 1
}
export type { T as NamespaceFirst }

export type { T as AliasFirst }
export namespace AliasFirst {
  export const a = 1
}
