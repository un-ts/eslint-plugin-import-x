import path from 'path'

import { pkgUp } from './pkg-up'

export function pkgDir(cwd: string) {
  const fp = pkgUp({ cwd })
  return fp ? path.dirname(fp) : null
}
