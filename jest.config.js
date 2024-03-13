const testCompiled = process.env.TEST_COMPILED === '1'

const srcDir = testCompiled ? 'lib' : 'src'

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  collectCoverage: !testCompiled,
  modulePathIgnorePatterns: ['<rootDir>/test/fixtures/with-syntax-error'],
  moduleNameMapper: {
    '^core/(.+)$': `<rootDir>/${srcDir}/core/$1`,
    '^eslint-plugin-import-x$': `<rootDir>/${srcDir}`,
    '^eslint-plugin-import-x/package.json$': '<rootDir>/package.json',
    '^eslint-plugin-import-x/(.+)$': `<rootDir>/${srcDir}/$1`,
    '^rules/(.+)$': `<rootDir>/${srcDir}/rules/$1`,
  },
  testMatch: [
    '<rootDir>/test/**/*.spec.js',
    '<rootDir>/test/**/*.spec.ts',
    '!<rootDir>/test/fixtures/**/*.js',
  ],
}
