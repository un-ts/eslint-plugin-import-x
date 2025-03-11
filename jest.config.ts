import type { Options as SwcOptions } from '@swc/core'
import type { Config } from 'jest'

const testCompiled = process.env.TEST_COMPILED === '1'

const srcDir = testCompiled ? 'lib' : 'src'

export default {
  collectCoverage: !testCompiled,
  modulePathIgnorePatterns: ['<rootDir>/test/fixtures/with-syntax-error'],
  moduleNameMapper: {
    '^eslint-plugin-import-x$': `<rootDir>/${srcDir}`,
    '^eslint-plugin-import-x/package.json$': `<rootDir>/package.json`,
    '^eslint-plugin-import-x/(.+)$': `<rootDir>/${srcDir}/$1`,
  },
  snapshotSerializers: ['<rootDir>/test/jest.serializer.ts'],
  testMatch: ['<rootDir>/test/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc-node/jest', {} satisfies SwcOptions],
  },
} satisfies Config
