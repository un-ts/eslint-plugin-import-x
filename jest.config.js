const testCompiled = process.env.TEST_COMPILED === '1'

const dir = testCompiled ? 'lib' : 'src'

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  collectCoverage: !testCompiled,
  modulePathIgnorePatterns: ['<rootDir>/test/fixtures/with-syntax-error'],
  moduleNameMapper: {
    '^core/(.+)$': `<rootDir>/${dir}/core/$1`,
    '^eslint-plugin-import-x$': `<rootDir>/${dir}/index.js`,
    '^eslint-plugin-import-x/package.json$': '<rootDir>/package.json',
    '^eslint-plugin-import-x/(.+)$': `<rootDir>/${dir}/$1`,
    '^rules/(.+)$': `<rootDir>/${dir}/rules/$1`,
  },
  testMatch: [
    '<rootDir>/test/**/*.spec.js',
    '!<rootDir>/test/fixtures/**/*.js',
  ],
}
