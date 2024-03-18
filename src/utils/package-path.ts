import path from 'node:path'

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
  return path.dirname(pkgUp({ cwd: filePath })!)
}

export function getFilePackageName(filePath: string): string | null {
  const { pkg, path: pkgPath } = readPkgUp({ cwd: filePath })
  if (pkg) {
    // recursion in case of intermediate esm package.json without name found
    return pkg.name || getFilePackageName(path.resolve(pkgPath, '../..'))
  }
  return null
}
