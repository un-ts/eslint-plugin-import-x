import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { TSESLint } from '@typescript-eslint/utils'
import { pluginName } from 'eslint-import-context'

import { srcDir } from './utils.js'

function isSourceFile(f: string) {
  const ext = path.extname(f)
  return ext === '.js' || (ext === '.ts' && !f.endsWith('.d.ts'))
}

function getRulePath(ruleName: string) {
  return path.resolve(srcDir, 'rules', ruleName)
}

describe('package', () => {
  const pkg = path.resolve(srcDir)

  let module: TSESLint.Linter.Plugin & {
    rules: Record<string, TSESLint.RuleModule<string>>
  }

  beforeAll(async () => {
    ;({ default: module } = await import(pathToFileURL(pkg).href))
  })

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

  it('has configs only for rules that exist', async () => {
    const preamble = `${pluginName}/`
    for (const config of Object.values(module.configs!)) {
      if (!config.rules) {
        continue
      }
      for (const rule of Object.keys(config.rules)) {
        await expect(
          import(pathToFileURL(getRulePath(rule.slice(preamble.length))).href),
        ).resolves.toHaveProperty('default')
      }
    }
  })

  it('marks deprecated rules in their metadata', () => {
    expect(module.rules!['imports-first'].meta.deprecated).toBeDefined()
    expect(module.rules!.first.meta.deprecated).not.toBe(true)
  })

  it('provides information about deprecated rules', () => {
    expect(module.rules!['imports-first'].meta).not.toHaveProperty('replacedBy')

    expect(typeof module.rules!['imports-first'].meta.deprecated).toBe('object')
    const deprecated = module.rules!['imports-first'].meta.deprecated as Record<
      string,
      unknown
    >

    expect(deprecated).toHaveProperty('message')
    expect(deprecated).toHaveProperty('url')
    expect(deprecated).toHaveProperty('deprecatedSince')
    expect(deprecated).toHaveProperty('replacedBy')

    expect(Array.isArray(deprecated.replacedBy)).toBe(true)
    const replacedBy = deprecated.replacedBy as unknown[]

    expect(typeof replacedBy[0]).toBe('object')
    expect(replacedBy[0]).toHaveProperty('message')
    expect(replacedBy[0]).toHaveProperty('rule')
  })
})
