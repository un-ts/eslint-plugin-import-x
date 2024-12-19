import path from 'node:path'

/**
 * Wrapper around `path.resolve` that replaces all `path.sep` with `/` to ensure it remains a valid glob pattern.
 */
export const globResolve = (...paths: string[]): string => {
  return path.resolve(...paths).replaceAll(path.sep, '/')
}
