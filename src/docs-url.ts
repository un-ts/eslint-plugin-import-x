// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - We're using commonjs
import pkg from '../package.json'

const repoUrl = 'https://github.com/un-es/eslint-plugin-import-x'

export const docsUrl = (ruleName: string, commitish = `v${pkg.version}`) =>
  `${repoUrl}/blob/${commitish}/docs/rules/${ruleName}.md`
