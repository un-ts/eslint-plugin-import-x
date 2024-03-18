import type { Config } from 'jest'

const testCompiled = process.env.TEST_COMPILED === '1'

const srcDir = testCompiled ? 'lib' : 'src'

export default {
  preset: 'ts-jest',
  collectCoverage: !testCompiled,
  modulePathIgnorePatterns: ['<rootDir>/test/fixtures/with-syntax-error'],
  moduleNameMapper: {
    '^eslint-plugin-import-x$': `<rootDir>/${srcDir}`,
    '^eslint-plugin-import-x/package.json$': `<rootDir>/package.json`,
    '^eslint-plugin-import-x/(.+)$': `<rootDir>/${srcDir}/$1`,
  },
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.base.json' }],
  },
} satisfies Config
