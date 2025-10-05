import fs from 'node:fs'
import path from 'node:path'

function findUp(filename: string | string[], cwd?: string): string | null {
  let dir = path.resolve(cwd || '')
  const root = path.parse(dir).root

  const filenames = [filename].flat()

  while (true) {
    const file = filenames.find(el => fs.existsSync(path.resolve(dir, el)))

    if (file) {
      return path.resolve(dir, file)
    }
    if (dir === root) {
      return null
    }

    dir = path.dirname(dir)
  }
}

export function pkgUp(opts?: { cwd?: string }) {
  return findUp('package.json', opts && opts.cwd)
}
