import fs from 'node:fs'

import { pkgUp } from './pkg-up.js'

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type PackageJson = typeof import('@package-json/types') extends never
  ? Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  : import('@package-json/types').PackageJson // eslint-disable-line @typescript-eslint/consistent-type-imports

function stripBOM(str: string) {
  return str.replace(/^\uFEFF/, '')
}

export function readPkgUp(opts?: { cwd?: string }) {
  const fp = pkgUp(opts)

  if (!fp) {
    return {}
  }

  try {
    return {
      pkg: JSON.parse(
        stripBOM(fs.readFileSync(fp, { encoding: 'utf8' })),
      ) as PackageJson & {
        name: string
      },
      path: fp,
    }
  } catch {
    return {}
  }
}
