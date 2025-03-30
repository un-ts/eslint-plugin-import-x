import { version } from '../meta.ts'

const repoUrl = 'https://github.com/un-ts/eslint-plugin-import-x'

export const docsUrl = (ruleName: string, commitish = `v${version}`) =>
  `${repoUrl}/blob/${commitish}/docs/rules/${ruleName}.md`
