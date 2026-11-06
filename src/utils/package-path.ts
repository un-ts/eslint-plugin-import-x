import path from 'node:path'

import type { RuleContext } from '../types.js'

import { pkgDir } from './pkg-dir.js'
import { readPkgUp } from './read-pkg-up.js'

export function getContextPackagePath(context: RuleContext) {
  // With no package.json above the file, the directory ESLint runs in stands in
  // for the root of the package, as it does when loading a legacy resolver.
  return getFilePackagePath(context.physicalFilename) ?? context.cwd
}

export function getFilePackagePath(filename: string) {
  return pkgDir(filename)
}

export function getFilePackageName(filename: string): string | null {
  const { pkg, path: pkgPath } = readPkgUp({ cwd: filename })
  if (pkg) {
    // recursion in case of intermediate esm package.json without name found
    return pkg.name || getFilePackageName(path.resolve(pkgPath, '../..'))
  }
  return null
}
