import path from 'node:path'

import type { RuleContext } from '../types.js'

import { pkgUp } from './pkg-up.js'
import { readPkgUp } from './read-pkg-up.js'

export function getContextPackagePath(context: RuleContext) {
  return getFilePackagePath(context.physicalFilename)
}

export function getFilePackagePath(filename: string) {
  return path.dirname(pkgUp({ cwd: filename })!)
}

export function getFilePackageName(filename: string): string | null {
  const { pkg, path: pkgPath } = readPkgUp({ cwd: filename })
  if (pkg) {
    // recursion in case of intermediate esm package.json without name found
    return pkg.name || getFilePackageName(path.resolve(pkgPath, '../..'))
  }
  return null
}
