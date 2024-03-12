import pkg from '../package.json'

const repoUrl = 'https://github.com/un-es/eslint-plugin-import-x'

export default function docsUrl(ruleName, commitish = `v${pkg.version}`) {
  return `${repoUrl}/blob/${commitish}/docs/rules/${ruleName}.md`
}
