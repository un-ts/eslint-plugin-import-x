let a = 1
let b = 2

export { a, b }

let c = 3
export { c as d }

export class ExportedClass {}

// destructuring exports

export const { destructuredProp, ...restProps } = {},
  { destructingAssign = null } = {},
  { destructingAssign: destructingRenamedAssign = null } = {},
  [arrayKeyProp, ...arrayRestKeyProps] = [],
  [{ deepProp }] = [],
  {
    // eslint-disable-next-line unicorn/no-unreadable-array-destructuring
    arr: [, , deepSparseElement],
  } = {}
