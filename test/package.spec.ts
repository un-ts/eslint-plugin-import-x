import path from 'path'
import fs from 'fs/promises'

import type { TSESLint } from '@typescript-eslint/utils'

import { moduleRequire, pluginName } from '../src/utils'
import { srcDir } from './utils'

function isSourceFile(f: string) {
  const ext = path.extname(f)
  return ext === '.js' || (ext === '.ts' && !f.endsWith('.d.ts'))
}

describe('package', () => {
  const pkg = path.resolve(srcDir)

  const module = moduleRequire<
    TSESLint.Linter.Plugin & {
      rules: Record<string, TSESLint.RuleModule<string>>
    }
  >(pkg)

  it('exists', () => {
    expect(module).toBeDefined()
  })

  it('has every rule', async () => {
    const files = await fs.readdir(path.resolve(pkg, 'rules'))
    files.filter(isSourceFile).forEach(f => {
      expect(module.rules).toHaveProperty(path.basename(f, path.extname(f)))
    })
  })

  it('exports all configs', async () => {
    const files = await fs.readdir(path.resolve(srcDir, 'config'))
    files.filter(isSourceFile).forEach(file => {
      expect(module.configs).toHaveProperty(
        path.basename(file, path.extname(file)),
      )
    })
  })

  it('has configs only for rules that exist', () => {
    const preamble = `${pluginName}/`
    for (const config of Object.values(module.configs!)) {
      if (!config.rules) {
        continue
      }
      for (const rule of Object.keys(config.rules)) {
        expect(() =>
          require(getRulePath(rule.slice(preamble.length))),
        ).not.toThrow()
      }
    }

    function getRulePath(ruleName: string) {
      return path.resolve(srcDir, 'rules', ruleName)
    }
  })

  it('marks deprecated rules in their metadata', () => {
    expect(module.rules!['imports-first'].meta.deprecated).toBe(true)
    expect(module.rules!.first.meta.deprecated).not.toBe(true)
  })
})
