/** Root API. */ declare module 'inline' {
  export const a: number
}
/** Subpath API. */ declare module 'inline/sub' {
  export const b: number
}
declare module /* odd */ 'inline/odd' {
  export const c: number
}
declare module /* odd */ 'inline/odd2' {
  export const d: number
}
