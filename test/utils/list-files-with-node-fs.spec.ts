import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { Linter } from 'eslint'

import {
  listFiles,
  listFilesWithNodeFs,
} from '../../src/utils/list-files-with-node-fs.js'

import plugin from 'eslint-plugin-import-x'

let root: string

const write = (file: string, content = 'export const a = 1\n') => {
  const full = path.join(root, file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}
const rel = (files: string[]) =>
  files.map(file => path.relative(root, file).replaceAll('\\', '/')).sort()

const fakeEnumerator = (impl: () => Iterable<{ filePath: string }>) => {
  const calls: unknown[] = []
  class FileEnumerator {
    constructor(options: unknown) {
      calls.push(options)
    }
    iterateFiles() {
      return impl()
    }
  }
  return { FileEnumerator, calls }
}
const noConfig = () => {
  throw new Error('No ESLint configuration found in /x')
}
const lint = (options: Record<string, unknown>) => {
  write('lib/used.js', 'export const used = 1\nexport const unused = 2\n')
  write('lib/main.js', "import { used } from './used.js'\nused\n")
  const filename = path.join(root, 'lib/used.js')
  const cwd = process.cwd()
  // ESLint 8.56 has no `shouldUseFlatConfig` and only reads this variable
  const { ESLINT_USE_FLAT_CONFIG } = process.env
  process.env.ESLINT_USE_FLAT_CONFIG = 'true'
  process.chdir(root)
  try {
    return new Linter({ cwd: root, configType: 'flat' }).verify(
      fs.readFileSync(filename, 'utf8'),
      [
        {
          plugins: { 'import-x': plugin as never },
          rules: {
            'import-x/no-unused-modules': [
              'error',
              {
                unusedExports: true,
                src: [path.join(root, 'lib')],
                ...options,
              },
            ],
          },
        },
      ],
      filename,
    )
  } finally {
    process.chdir(cwd)
    if (ESLINT_USE_FLAT_CONFIG === undefined) {
      delete process.env.ESLINT_USE_FLAT_CONFIG
    } else {
      process.env.ESLINT_USE_FLAT_CONFIG = ESLINT_USE_FLAT_CONFIG
    }
  }
}

describe('listFilesWithNodeFs', () => {
  beforeEach(() => {
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), 'import-x-list-files-')),
    )
    write('src/a.js')
    write('src/b.ts')
    write('src/c.txt')
    write('src/deep/d.js')
    write('src/.hidden/e.js')
    write('src/node_modules/pkg/f.js')
    write('dist/g.js')
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('walks directories, skipping node_modules, dot entries and other extensions', () => {
    expect(rel(listFilesWithNodeFs([root], ['.js', '.ts']))).toEqual([
      'dist/g.js',
      'src/a.js',
      'src/b.ts',
      'src/deep/d.js',
    ])
  })

  it('accepts files and globs', () => {
    expect(
      rel(
        listFilesWithNodeFs(
          [path.join(root, 'src/a.js'), path.join(root, 'src/*.ts')],
          ['.js', '.ts'],
        ),
      ),
    ).toEqual(['src/a.js', 'src/b.ts'])
    expect(
      rel(listFilesWithNodeFs([path.join(root, 'src/**/*.js')], ['.js'])),
    ).toEqual(['src/a.js', 'src/deep/d.js'])
  })

  it('takes existing paths literally, also inside braces', () => {
    write('lib/[x].js')
    expect(
      rel(listFilesWithNodeFs([path.join(root, 'lib/[x].js')], ['.js'])),
    ).toEqual(['lib/[x].js'])
    expect(
      rel(
        listFilesWithNodeFs([path.join(root, '{src/a.js,dist/g.js}')], ['.js']),
      ),
    ).toEqual(['dist/g.js', 'src/a.js'])
  })

  it('throws for entries that match nothing', () => {
    expect(() =>
      listFilesWithNodeFs([path.join(root, 'missing')], ['.js']),
    ).toThrow(/No files matching the pattern ".*missing" were found/)
    expect(() =>
      listFilesWithNodeFs([path.join(root, 'src/*.md')], ['.js']),
    ).toThrow('No files matching the pattern')
  })

  describe('listFiles', () => {
    const exts = ['.js']
    const env = process.env.ESLINT_USE_FLAT_CONFIG

    afterEach(() => {
      if (env === undefined) {
        delete process.env.ESLINT_USE_FLAT_CONFIG
      } else {
        process.env.ESLINT_USE_FLAT_CONFIG = env
      }
    })

    it('walks the fs when FileEnumerator is absent', () => {
      expect(rel(listFiles([path.join(root, 'src')], exts))).toEqual([
        'src/a.js',
        'src/deep/d.js',
      ])
    })

    it('uses FileEnumerator when present', () => {
      const { FileEnumerator, calls } = fakeEnumerator(() => [
        { filePath: '/enum/x.js' },
      ])
      expect(
        listFiles([path.join(root, 'src')], exts, {
          FileEnumerator,
          shouldUseFlatConfig: () => true,
        }),
      ).toEqual(['/enum/x.js'])
      expect(calls).toEqual([{ extensions: exts }])
    })

    it('falls back to the fs walk when flat config has no eslintrc', () => {
      delete process.env.ESLINT_USE_FLAT_CONFIG
      const { FileEnumerator } = fakeEnumerator(noConfig)
      expect(
        rel(
          listFiles([path.join(root, 'src')], exts, {
            FileEnumerator,
            shouldUseFlatConfig: () => true,
          }),
        ),
      ).toEqual(['src/a.js', 'src/deep/d.js'])
    })

    it('rethrows when not using flat config', () => {
      process.env.ESLINT_USE_FLAT_CONFIG = 'false'
      const { FileEnumerator } = fakeEnumerator(noConfig)
      expect(() =>
        listFiles([root], exts, { FileEnumerator, shouldUseFlatConfig: true }),
      ).toThrow('No ESLint configuration found')
    })

    it('rethrows other errors', () => {
      const { FileEnumerator } = fakeEnumerator(() => {
        throw new Error('boom')
      })
      expect(() =>
        listFiles([root], exts, { FileEnumerator, shouldUseFlatConfig: true }),
      ).toThrow('boom')
    })
  })

  describe('no-unused-modules without an eslintrc', () => {
    it('reports unused exports', () => {
      expect(lint({}).map(({ message }) => message)).toEqual([
        "exported declaration 'unused' not used within other modules",
      ])
    })

    it('honors ignoreExports and the deprecated warning option', () => {
      expect(
        lint({
          ignoreExports: [path.join(root, 'lib/used.js')],
          suppressMissingFileEnumeratorAPIWarning: true,
        }),
      ).toEqual([])
    })
  })
})
