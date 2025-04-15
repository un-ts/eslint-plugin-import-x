import { createRequire } from 'node:module'

import type { CjsRequire } from '@pkgr/core'

const EVAL = new Set(['[eval]', '[worker eval]'])

const cjsRequire: CjsRequire =
  typeof require === 'undefined' || EVAL.has(__filename)
    ? createRequire(import.meta.url)
    : /* istanbul ignore next */ require

export const { name, version } = cjsRequire<{ name: string; version: string }>(
  '../package.json',
)

export const meta = { name, version }
