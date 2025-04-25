import { createRequire } from 'node:module'

import type { CjsRequire } from './types.js'

const importMetaUrl = import.meta.url

export const cjsRequire: CjsRequire = importMetaUrl
  ? createRequire(importMetaUrl)
  : /* istanbul ignore next */ require
