/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  collectCoverage: true,
  modulePathIgnorePatterns: ['<rootDir>/test/fixtures/with-syntax-error'],
  moduleNameMapper: {
    '^core/(.+)$': '<rootDir>/src/core/$1',
    '^eslint-plugin-import-x$': '<rootDir>/src/index.js',
    '^eslint-plugin-import-x/config/(.+)$': '<rootDir>/config/$1',
    '^eslint-plugin-import-x/package.json$': '<rootDir>/package.json',
    '^eslint-plugin-import-x/(.+)$': '<rootDir>/src/$1',
    '^rules/(.+)$': '<rootDir>/src/rules/$1',
  },
  testMatch: [
    '<rootDir>/test/**/*.spec.js',
    '!<rootDir>/test/fixtures/**/*.js',
  ],
}
