export {
  foo as RenamedValue,
  T as RenamedType,
  C as RenamedClass,
  E as RenamedEnum,
  default as RenamedDefault,
} from './mixed'
export type { foo as TypeValue, C as TypeClass } from './mixed'

import { fn, T, C } from './mixed'

export { fn as ImportedValue, T as ImportedType, C as ImportedClass }
export { LocalType, LocalClass }

type LocalType = string
class LocalClass {}
