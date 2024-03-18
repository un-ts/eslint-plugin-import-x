import { dirname } from 'path'

import type { RuleContext } from '../types'

import { pkgUp } from './pkg-up'
import { readPkgUp } from './read-pkg-up'

export function getContextPackagePath(context: RuleContext) {
  return getFilePackagePath(
    context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename(),
  )
}

export function getFilePackagePath(filePath: string) {
  return dirname(pkgUp({ cwd: filePath })!)
}

export function getFilePackageName(filePath: string): string | null {
  const { pkg, path } = readPkgUp({ cwd: filePath })
  if (pkg) {
    // recursion in case of intermediate esm package.json without name found
    return pkg.name || getFilePackageName(dirname(dirname(path)))
  }
  return null
}
