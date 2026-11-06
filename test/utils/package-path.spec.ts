import path from 'node:path'

import { hidePackageJsonFiles, testFilePath } from '../utils.js'

import type { RuleContext } from 'eslint-plugin-import-x'
import {
  getContextPackagePath,
  getFilePackagePath,
} from 'eslint-plugin-import-x/utils'

const context = (physicalFilename: string, cwd: string) =>
  ({ physicalFilename, cwd }) as RuleContext

describe('package path', () => {
  describe('with a package.json above the file', () => {
    it('returns the package dir for the file', () => {
      expect(getFilePackagePath(testFilePath('foo.ts'))).toBe(
        path.dirname(testFilePath('foo.ts')),
      )
    })

    it('returns the package dir for the context', () => {
      expect(
        getContextPackagePath(context(testFilePath('foo.ts'), '/elsewhere')),
      ).toBe(path.dirname(testFilePath('foo.ts')))
    })
  })

  describe('without a package.json', () => {
    hidePackageJsonFiles()

    it('returns null for the file', () => {
      expect(getFilePackagePath('/no-package-json-here/bar.js')).toBeNull()
    })

    it('falls back to the directory ESLint runs in', () => {
      expect(
        getContextPackagePath(
          context('/no-package-json-here/bar.js', '/fallback'),
        ),
      ).toBe('/fallback')
    })
  })
})
