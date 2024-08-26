import fs from 'node:fs/promises'
import path from 'node:path'

import type { TSESLint } from '@typescript-eslint/utils'

import { srcDir } from './utils'

import { moduleRequire, pluginName } from 'eslint-plugin-import-x/utils'

function isSourceFile(f: string) {
  const ext = path.extname(f)
  return ext === '.js' || (ext === '.ts' && !f.endsWith('.d.ts'))
}

function getRulePath(ruleName: string) {
  return path.resolve(srcDir, 'rules', ruleName)
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
    for (const f of files.filter(isSourceFile)) {
      expect(module.rules).toHaveProperty(path.basename(f, path.extname(f)))
    }
  })

  it('exports all configs', async () => {
    const files = await fs.readdir(path.resolve(srcDir, 'config'))
    for (const file of files.filter(isSourceFile)) {
      expect(module.configs).toHaveProperty(
        path.basename(file, path.extname(file)),
      )
    }
  })

  it('has configs only for rules that exist', () => {
    const preamble = `${pluginName}/`
    for (const config of Object.values(module.configs!)) {
      if (!config.rules) {
        continue
      }
      for (const rule of Object.keys(config.rules)) {
        console.log({ rule, preamble })
        expect(() =>
          require(getRulePath(rule.slice(preamble.length))),
        ).not.toThrow()
      }
    }
  })

  it('marks deprecated rules in their metadata', () => {
    expect(module.rules!['imports-first'].meta.deprecated).toBe(true)
    expect(module.rules!.first.meta.deprecated).not.toBe(true)
  })
})
