import { dirname } from 'path'

import { pkgUp } from '../utils/pkg-up'
import { readPkgUp } from '../utils/read-pkg-ip'
import { RuleContext } from '../types'

export function getContextPackagePath(context: RuleContext) {
  return getFilePackagePath(
    context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename(),
  )
}

export function getFilePackagePath(filePath: string) {
  const fp = pkgUp({ cwd: filePath })!
  return dirname(fp)
}

export function getFilePackageName(filePath: string): string | null {
  const { pkg, path } = readPkgUp({ cwd: filePath })
  if (pkg) {
    // recursion in case of intermediate esm package.json without name found
    return pkg.name || getFilePackageName(dirname(dirname(path)))
  }
  return null
}
