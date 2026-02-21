/** Tests that require fully booting up ESLint */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

// eslint-disable-next-line import-x/default -- incorrect types , commonjs actually
import eslintUnsupportedApi from 'eslint/use-at-your-own-risk'

import importPlugin from 'eslint-plugin-import-x'

const describeSkipIfESLintV10 =
  'LegacyESLint' in eslintUnsupportedApi ? describe.skip : describe

describeSkipIfESLintV10('CLI regression tests', () => {
  const testDir = path.resolve(fileURLToPath(import.meta.url), '..')

  describe('issue #210', () => {
    it("doesn't throw an error on gratuitous, erroneous self-reference", () => {
      // eslint-disable-next-line import-x/no-named-as-default-member -- incorrect types , commonjs actually
      const eslint = new eslintUnsupportedApi.LegacyESLint({
        cwd: testDir,
        overrideConfigFile: 'fixtures/issue210.config.js',
        overrideConfig: {
          rules: {
            named: 2,
          },
        },
        plugins: {
          // @ts-expect-error - incompatible types
          'eslint-plugin-import-x': importPlugin,
        },
      })
      return eslint.lintFiles(['fixtures/issue210.js'])
    })
  })

  describe('issue #1645', () => {
    it('throws an error on invalid JSON', async () => {
      const invalidJSON = 'fixtures/just-json-files/invalid.json'
      // eslint-disable-next-line import-x/no-named-as-default-member -- incorrect types , commonjs actually
      const eslint = new eslintUnsupportedApi.LegacyESLint({
        cwd: testDir,
        overrideConfigFile: 'fixtures/just-json-files/.eslintrc.json',
        ignore: false,
        plugins: {
          // @ts-expect-error - incompatible types
          'eslint-plugin-import-x': importPlugin,
        },
      })
      const results = await eslint.lintFiles([invalidJSON])
      expect(results).toEqual([
        {
          filePath: path.resolve(testDir, invalidJSON),
          messages: [
            {
              column: 2,
              endColumn: 3,
              endLine: 1,
              line: 1,
              message: 'Expected a JSON object, array or literal.',
              nodeType: results[0].messages[0].nodeType, // we don't care about this one
              ruleId: 'json/*',
              severity: 2,
              // @ts-expect-error - legacy types
              source: results[0].messages[0].source, // NewLine-characters might differ depending on git-settings
            },
          ],
          errorCount: 1,
          fatalErrorCount: 0,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
          source: results[0].source, // NewLine-characters might differ depending on git-settings
          suppressedMessages: [],
          usedDeprecatedRules: results[0].usedDeprecatedRules, // we don't care about this one
        },
      ])
    })
  })
})
