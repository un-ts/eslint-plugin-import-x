import path from 'path'

const config = require(
  path.join(__dirname, '..', '..', '..', 'config', 'typescript'),
)

describe('config typescript', () => {
  // https://github.com/import-js/eslint-plugin-import/issues/1525
  it('should mark @types paths as external', () => {
    const externalModuleFolders = config.settings['i/external-module-folders']
    expect(externalModuleFolders).toBeDefined()
    expect(externalModuleFolders).toContain('node_modules')
    expect(externalModuleFolders).toContain('node_modules/@types')
  })
})
