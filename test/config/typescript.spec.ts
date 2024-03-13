import config from '../../src/config/typescript'

describe('config typescript', () => {
  // https://github.com/import-js/eslint-plugin-import/issues/1525
  it('should mark @types paths as external', () => {
    const externalModuleFolders =
      config.settings['import-x/external-module-folders']
    expect(externalModuleFolders).toBeDefined()
    expect(externalModuleFolders).toContain('node_modules')
    expect(externalModuleFolders).toContain('node_modules/@types')
  })
})
