import { createRequire } from 'node:module'

import type { CjsRequire } from '@pkgr/core'

const cjsRequire: CjsRequire =
  typeof require === 'undefined' || __filename === '[eval]'
    ? createRequire(import.meta.url)
    : /* istanbul ignore next */ require

export const { name, version } = cjsRequire<{ name: string; version: string }>(
  '../package.json',
)

export const meta = { name, version }
