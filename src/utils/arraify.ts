export const arraify = <T>(value?: T | readonly T[]): T[] | undefined =>
  value ? ((Array.isArray(value) ? value : [value]) as T[]) : undefined
