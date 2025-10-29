import type { Options } from '@swc-node/core'
import type { Config } from 'jest'

const testCompiled = process.env.TEST_COMPILED === '1'

const srcDir = testCompiled ? 'lib' : 'src'

export default {
  collectCoverage: !testCompiled,
  modulePathIgnorePatterns: ['<rootDir>/test/fixtures/with-syntax-error'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.c?js$': '$1',
    '^eslint-plugin-import-x$': `<rootDir>/${srcDir}/index.${testCompiled ? 'cjs' : 'ts'}`,
    '^eslint-plugin-import-x/package.json$': `<rootDir>/package.json`,
    '^eslint-plugin-import-x/(.+)$': `<rootDir>/${srcDir}/$1`,
  },
  snapshotSerializers: ['<rootDir>/test/jest.serializer.cjs'],
  testMatch: ['<rootDir>/test/**/fixtures.spec.ts'],
  transform: {
    '^.+\\.(m?[jt]s|[jt]sx?)$': [
      '@swc-node/jest',
      {
        module: 'es6',
      } satisfies Options,
    ],
    '^.+\\.c[jt]s$': ['@swc-node/jest', {} satisfies Options],
  },
  extensionsToTreatAsEsm: ['.jsx', '.mts', '.ts', '.tsx'],
} satisfies Config
