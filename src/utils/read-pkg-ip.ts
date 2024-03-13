import fs from 'fs'

import type { PackageJson } from 'type-fest'

import { pkgUp } from './pkg-up'

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
        stripBOM(fs.readFileSync(fp, { encoding: 'utf-8' })),
      ) as PackageJson,
      path: fp,
    }
  } catch (e) {
    return {}
  }
}
