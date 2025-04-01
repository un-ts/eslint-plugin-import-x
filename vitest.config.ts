import path from 'node:path'

import { defineConfig } from 'vitest/config'
import type { TestProjectConfiguration } from 'vitest/config'

const getTestWorkspace = (testCompiled?: boolean): TestProjectConfiguration => {
  const srcDir = testCompiled ? 'lib' : 'src'
  const baseDir = path.resolve(srcDir)
  const extname = testCompiled ? 'js' : 'ts'
  return {
    extends: true,
    test: {
      name: testCompiled ? 'compiled' : 'source',
      globals: true,
      env: {
        TEST_COMPILED: testCompiled ? '1' : undefined,
      },
      alias: [
        {
          find: /^eslint-plugin-import-x$/,
          replacement: path.resolve(
            baseDir,
            `index.${testCompiled ? 'cjs' : 'ts'}`,
          ),
        },
        {
          find: /^eslint-plugin-import-x\/package\.json$/,
          replacement: path.resolve(`package.json`),
        },
        {
          find: /^eslint-plugin-import-x\/(config|rules|utils)$/,
          replacement: path.resolve(baseDir, `$1/index.${extname}`),
        },
        {
          find: /^eslint-plugin-import-x\/(.*)$/,
          replacement: path.resolve(baseDir, `$1.${extname}`),
        },
      ],
    },
  }
}

export default defineConfig({
  test: {
    coverage: {
      provider: 'istanbul',
      reporter: ['lcov', 'json'],
    },
    workspace: [getTestWorkspace(), getTestWorkspace(true)],
    setupFiles: ['test/vitest.serializer.ts'],
  },
})
