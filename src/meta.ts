import { createRequire } from 'node:module'

import { EVAL_FILENAMES } from '@pkgr/core'
import type { CjsRequire } from '@pkgr/core'

const cjsRequire: CjsRequire =
  typeof require === 'undefined' ||
  // workaround for #296
  EVAL_FILENAMES.has(__filename)
    ? createRequire(import.meta.url)
    : /* istanbul ignore next */ require

export const { name, version } = cjsRequire<{ name: string; version: string }>(
  '../package.json',
)

export const meta = { name, version }
