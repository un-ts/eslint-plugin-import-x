import path from 'path'

import { pkgUp } from './pkgUp'

export function pkgDir(cwd: string) {
  const fp = pkgUp({ cwd })
  return fp ? path.dirname(fp) : null
}
