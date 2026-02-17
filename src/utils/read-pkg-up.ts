import fs from 'node:fs'

import type { PackageJson } from '@package-json/types'

import { pkgUp } from './pkg-up.js'

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
