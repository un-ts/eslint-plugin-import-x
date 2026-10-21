interface I {
  x: 1
}

export namespace NamespaceFirst {
  export const a = 1
}
export type { I as NamespaceFirst }

export { type I as TypeFirst }
export namespace TypeFirst {
  export const a = 1
}
