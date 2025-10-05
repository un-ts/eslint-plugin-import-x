import path from 'node:path'

import { pkgUp } from './pkg-up.js'

export function pkgDir(cwd: string) {
  const fp = pkgUp({ cwd })
  return fp ? path.dirname(fp) : null
}
