import fs from 'node:fs'
import path from 'node:path'

import isGlob from 'is-glob'
import { GLOBSTAR, Minimatch, braceExpand } from 'minimatch'

function walkDirectory(
  dir: string,
  extensions: string[],
  results: string[],
  recursive: boolean,
) {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    const { name } = entry
    if (name.startsWith('.') || name === 'node_modules') {
      continue
    }
    const fullPath = path.join(dir, name)
    // follow symlinks like `statSync` does
    let stat: fs.Stats
    try {
      stat = fs.statSync(fullPath)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      if (recursive) {
        walkDirectory(fullPath, extensions, results, recursive)
      }
    } else if (stat.isFile() && extensions.includes(path.extname(fullPath))) {
      results.push(fullPath)
    }
  }

  return results
}

/**
 * Adds a literal file, or the files of a literal directory. Returns `false`
 * when nothing exists at the path or the directory has no matching files.
 */
function addLiteralPath(resolved: string, exts: string[], results: string[]) {
  let stat: fs.Stats
  try {
    stat = fs.statSync(resolved)
  } catch {
    return false
  }
  if (stat.isDirectory()) {
    const before = results.length
    walkDirectory(resolved, exts, results, true)
    return results.length > before
  }
  if (stat.isFile() && exts.includes(path.extname(resolved))) {
    results.push(resolved)
  }
  return true
}

/** Adds the files matching a glob. Returns whether any file matched. */
function addGlobMatches(pattern: string, exts: string[], results: string[]) {
  // minimatch only understands `/`
  const mm = new Minimatch(path.resolve(pattern).replaceAll('\\', '/'), {
    dot: true,
    matchBase: true,
  })
  const segments = mm.set[0] || []
  const baseParts: string[] = []
  // the last segment names files, even when minimatch made it literal (`[a].js`)
  while (
    baseParts.length < segments.length - 1 &&
    typeof segments[baseParts.length] === 'string'
  ) {
    baseParts.push(segments[baseParts.length] as string)
  }
  const base = baseParts.join('/') || '/'
  const globPart = segments.slice(baseParts.length)
  // `src/*.js` stays in `src/`, `src/**/*.js` recurses
  const recursive = globPart.length > 1 || globPart.includes(GLOBSTAR)
  let matched = false
  for (const file of walkDirectory(base, exts, [], recursive)) {
    // eslint-disable-next-line unicorn/prefer-regexp-test -- `Minimatch#match` is not `String#match`
    if (mm.match(file.replaceAll('\\', '/'))) {
      results.push(file)
      matched = true
    }
  }
  return matched
}

/**
 * List files without ESLint's `FileEnumerator`, which is removed in ESLint 10
 * and needs an eslintrc in ESLint 9. Skips `node_modules` and dot entries.
 * Like `FileEnumerator`, an existing path is taken literally before it is
 * treated as a glob, and an entry that matches nothing throws.
 */
export function listFilesWithNodeFs(src: string[], extensions: string[]) {
  const exts = extensions.map(ext => (ext.startsWith('.') ? ext : `.${ext}`))
  const results: string[] = []

  for (const entry of src) {
    // on Windows `\` is a path separator, not a glob escape
    const pattern = path.sep === '\\' ? entry.replaceAll('\\', '/') : entry
    let found = addLiteralPath(path.resolve(pattern), exts, results)
    if (!found && isGlob(pattern)) {
      for (const expanded of braceExpand(pattern)) {
        if (
          addLiteralPath(path.resolve(expanded), exts, results) ||
          addGlobMatches(expanded, exts, results)
        ) {
          found = true
        }
      }
    }
    if (!found) {
      throw new Error(`No files matching the pattern "${entry}" were found.`)
    }
  }

  return results
}

export interface FileEnumeratorApi {
  FileEnumerator: new (options: { extensions: string[] }) => {
    iterateFiles(src: string[]): Iterable<{ filePath: string }>
  }
  shouldUseFlatConfig?: unknown
}

/**
 * Uses `FileEnumerator` when available, and falls back to a plain fs walk when
 * it is missing (ESLint 10) or throws for lack of an eslintrc under flat config.
 */
export function listFiles(
  src: string[],
  extensions: string[],
  api?: FileEnumeratorApi,
): string[] {
  if (!api) {
    return listFilesWithNodeFs(src, extensions)
  }

  const { FileEnumerator, shouldUseFlatConfig } = api
  const { ESLINT_USE_FLAT_CONFIG } = process.env

  // `shouldUseFlatConfig` only exists in ESLint 9
  const isUsingFlatConfig = shouldUseFlatConfig
    ? ESLINT_USE_FLAT_CONFIG !== 'false'
    : !!ESLINT_USE_FLAT_CONFIG && ESLINT_USE_FLAT_CONFIG !== 'false'

  try {
    return Array.from(
      new FileEnumerator({ extensions }).iterateFiles(src),
      ({ filePath }) => filePath,
    )
  } catch (error) {
    if (
      isUsingFlatConfig &&
      (error as Error).message.includes('No ESLint configuration found')
    ) {
      return listFilesWithNodeFs(src, extensions)
    }
    throw error
  }
}
