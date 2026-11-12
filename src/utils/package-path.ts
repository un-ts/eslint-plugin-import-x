import fs from 'node:fs'
import path from 'node:path'

import type { RuleContext } from '../types.js'

import { pkgDir } from './pkg-dir.js'
import { readPkgUp } from './read-pkg-up.js'

export function getContextPackagePath(context: RuleContext) {
  // With no package.json above the file, the directory ESLint runs in stands in
  // for the root of the package, as it does when loading a legacy resolver.
  return getFilePackagePath(context.physicalFilename) ?? context.cwd
}

const realPackagePaths = new Map<string, string>()

/**
 * The package path to compare `filepath` with. Resolvers return real paths, but
 * the linted file can be reached through a symlink, or `package.json` can be a
 * symlink in a tree of them.
 */
export function getContextPackagePathFor(
  context: RuleContext,
  filepath: string,
) {
  const packagePath = getContextPackagePath(context)
  if (!path.relative(packagePath, filepath).startsWith('..')) {
    return packagePath
  }
  let realPath = realPackagePaths.get(packagePath)
  if (realPath === undefined) {
    const manifest = path.join(packagePath, 'package.json')
    try {
      realPath = fs.existsSync(manifest)
        ? path.dirname(fs.realpathSync(manifest))
        : fs.realpathSync(packagePath)
    } catch {
      realPath = packagePath
    }
    realPackagePaths.set(packagePath, realPath)
  }
  return path.relative(realPath, filepath).startsWith('..')
    ? packagePath
    : realPath
}

/** The linted file in the same form as {@link getContextPackagePathFor}. */
export function getContextFilenameFor(context: RuleContext, filepath: string) {
  const filename = context.physicalFilename
  return path.resolve(
    getContextPackagePathFor(context, filepath),
    path.relative(getContextPackagePath(context), filename),
  )
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
