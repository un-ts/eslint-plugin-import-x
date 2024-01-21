import path from 'path'

import pkgUp from 'eslint-module-utils/pkgUp'
import readPkgUp from 'eslint-module-utils/readPkgUp'

/**
 *
 * @param {import('eslint').Rule.RuleContext} context
 * @returns
 */
export function getContextPackagePath(context) {
  return getFilePackagePath(
    context.getPhysicalFilename
      ? context.getPhysicalFilename()
      : context.getFilename(),
  )
}

/**
 * @param {string} filepath
 */
export function getFilePackagePath(filepath) {
  const fp = pkgUp({ cwd: filepath })
  return fp && path.dirname(fp)
}

/**
 * @param {string} filepath
 * @returns {string | null}
 */
export function getFilePackageName(filepath) {
  const { pkg, path } = readPkgUp({ cwd: filepath, normalize: false })
  if (pkg) {
    // recursion in case of intermediate esm package.json without name found
    return pkg.name || getFilePackageName(path.dirname(path.dirname(path)))
  }
  return null
}
