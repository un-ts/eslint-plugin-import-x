import { format } from 'prettier'

import prettierRC from './.prettierrc.js'

/** @type {import('eslint-doc-generator').GenerateOptions} */
const config = {
  configEmoji: [
    ['recommended', '☑️'],
    ['flat/errors', '❗'],
    ['flat/recommended', '☑️'],
    ['flat/typescript', '⌨️'],
    ['flat/warnings', '🚸'],
  ],
  ruleDocTitleFormat: 'prefix-name',
  ruleDocSectionOptions: false,
  ignoreConfig: ['stage-0', 'flat/stage-0'],
  ruleListSplit: 'meta.docs.category',
  postprocess: content =>
    format(content, { ...prettierRC, parser: 'markdown' }),
}

export default config
