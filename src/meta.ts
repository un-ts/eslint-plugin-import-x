import { cjsRequire } from './require.js'

export const { name, version } = cjsRequire<{ name: string; version: string }>(
  '../package.json',
)

export const meta = { name, version }
