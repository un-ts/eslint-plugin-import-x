import fs from 'node:fs'
import { isBuiltin } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// @ts-expect-error -- upstream cjs types are incorrect
import { resolve } from '@dual-bundle/import-meta-resolve'

import type { NewResolver } from './types'

const pathSuffixes = [
  '',
  '.js',
  '.json',
  `${path.sep}index.js`,
  `${path.sep}index.json`,
]

const specifierSuffixes = ['', '.js', '.json', '/index.js', '/index.json']

function existsFile(filename: string) {
  return fs.statSync(filename, { throwIfNoEntry: false })?.isFile() ?? false
}

function resolveSilent(specifier: string, basepath: string) {
  if (path.isAbsolute(specifier)) {
    for (const suffix of pathSuffixes) {
      const filename = specifier + suffix

      if (existsFile(filename)) {
        return filename
      }
    }

    return
  }

  const base = pathToFileURL(basepath).toString()

  for (const suffix of specifierSuffixes) {
    try {
      const resolved = fileURLToPath(resolve(specifier + suffix, base))
      if (existsFile(resolved)) {
        return resolved
      }
    } catch {
      //
    }
  }
}

export function createNodeResolver(): NewResolver {
  return {
    interfaceVersion: 3,
    name: 'eslint-plugin-import-x built-in node resolver',
    resolve(modulePath, sourceFile) {
      if (isBuiltin(modulePath)) {
        return { found: true, path: null }
      }

      if (modulePath.startsWith('data:')) {
        return { found: true, path: null }
      }

      try {
        const resolved = resolveSilent(modulePath, sourceFile)
        if (resolved) {
          return { found: true, path: resolved }
        }
        return { found: false }
      } catch (error) {
        console.error(error)
        return { found: false }
      }
    },
  }
}
