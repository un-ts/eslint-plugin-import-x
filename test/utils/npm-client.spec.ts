import { jest } from '@jest/globals'

import type { NpmClient } from 'eslint-plugin-import-x/utils'

describe('npm-client', () => {
  let getNpmClient!: () => NpmClient
  let getNpmInstallCommand!: (packageName: string) => string

  beforeEach(async () => {
    delete process.env.npm_config_user_agent
    jest.resetModules()
    ;({ getNpmClient, getNpmInstallCommand } = await import(
      'eslint-plugin-import-x/utils'
    ))
  })

  it('should return npm as default client', () => {
    expect(getNpmClient()).toBe('npm')
    expect(getNpmInstallCommand('foo')).toBe('npm i foo')
  })

  it('should read npm client from environment variable', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.10'
    expect(getNpmClient()).toBe('yarn')
    expect(getNpmInstallCommand('foo')).toBe('yarn add foo')
  })

  it('should support deno specially', () => {
    process.env.npm_config_user_agent = 'deno/1.0.0'
    expect(getNpmClient()).toBe('deno')
    expect(getNpmInstallCommand('foo')).toBe('deno add npm:foo')
  })

  it('should return npm for unknown clients', () => {
    process.env.npm_config_user_agent = 'unknown'
    expect(getNpmClient()).toBe('npm')
    expect(getNpmInstallCommand('foo')).toBe('npm i foo')
  })
})
