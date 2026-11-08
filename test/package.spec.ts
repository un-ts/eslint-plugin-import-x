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

  it('does not import optional peer dependencies at runtime', async () => {
    // `@typescript-eslint/utils` is an optional peer, so only type imports
    // from it may reach the published build
    const files = await fs.readdir(pkg, { recursive: true })
    const offenders: string[] = []
    for (const f of files.filter(isSourceFile)) {
      const content = await fs.readFile(path.resolve(pkg, f), 'utf8')
      if (
        /^(?:import|export)\s+(?!type\b)(?:[\w$*\s,]*\{[^}]*\}|[\w$*\s,]+?)\s*from\s+['"]@typescript-eslint\/utils['"]/m.test(
          content,
        )
      ) {
        offenders.push(f)
      }
    }
    expect(offenders).toEqual([])
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
    expect(module.rules!['imports-first'].meta.deprecated).toEqual(
      expect.objectContaining<TSESLint.DeprecatedInfo>({
        message: expect.any(String),
        url: expect.any(String),
        deprecatedSince: expect.any(String),
        replacedBy: [
          {
            message: expect.any(String),
            rule: {
              name: expect.any(String),
              url: expect.any(String),
            },
          },
        ],
      }),
    )
  })
})
