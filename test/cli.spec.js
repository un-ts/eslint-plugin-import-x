/**
 * tests that require fully booting up ESLint
 */
import path from 'path'

import { CLIEngine, ESLint } from 'eslint'
import eslintPkg from 'eslint/package.json'
import semver from 'semver'

import * as importPlugin from 'eslint-plugin-i'

describe('CLI regression tests', function () {
  describe('issue #210', function () {
    /**
     * @type {import('eslint').ESLint}
     */
    let eslint
    /**
     * @type {import('eslint7').CLIEngine}
     */
    let cli
    beforeEach(function () {
      if (ESLint) {
        eslint = new ESLint({
          useEslintrc: false,
          baseConfig: {
            parserOptions: {
              ecmaVersion: 'latest',
            },
          },
          overrideConfigFile: './test/fixtures/issue210.config.js',
          rulePaths: ['./src/rules'],
          plugins: {
            'eslint-plugin-i': importPlugin,
          },
          rules: {
            named: 2,
            'i/no-self-import': 'error',
          },
        })
      } else {
        cli = new /** @type {typeof import('eslint7').CLIEngine} */ (CLIEngine)(
          {
            useEslintrc: false,
            baseConfig: {
              parserOptions: {
                ecmaVersion: 'latest',
              },
            },
            configFile: './test/fixtures/issue210.config.js',
            rulePaths: ['./src/rules'],
            rules: {
              named: 2,
              'i/no-self-import': 'error',
            },
          },
        )
        cli.addPlugin('eslint-plugin-i', importPlugin)
      }
    })
    it("doesn't throw an error on gratuitous, erroneous self-reference", async () => {
      if (eslint) {
        // eslint-disable-next-line jest/no-conditional-expect
        return expect(() =>
          eslint.lintFiles(['./test/fixtures/issue210.js']),
        ).rejects.toThrow()
      } else {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(() =>
          cli.executeOnFiles(['./test/fixtures/issue210.js']),
        ).not.toThrow()
      }
    })
  })

  describe('issue #1645', function () {
    /**
     * @type {import('eslint').ESLint}
     */
    let eslint
    /**
     * @type {import('eslint7').CLIEngine}
     */
    let cli
    beforeEach(function () {
      if (ESLint) {
        eslint = new ESLint({
          useEslintrc: false,
          overrideConfigFile: './test/fixtures/just-json-files/.eslintrc.json',
          rulePaths: ['./src/rules'],
          ignore: false,
          plugins: { 'eslint-plugin-i': importPlugin },
        })
      } else {
        cli = new CLIEngine({
          useEslintrc: false,
          configFile: './test/fixtures/just-json-files/.eslintrc.json',
          rulePaths: ['./src/rules'],
          ignore: false,
        })
        cli.addPlugin('eslint-plugin-i', importPlugin)
      }
    })

    it('throws an error on invalid JSON', async () => {
      const invalidJSON = './test/fixtures/just-json-files/invalid.json'
      if (eslint) {
        const results = await eslint.lintFiles([invalidJSON])
        // eslint-disable-next-line jest/valid-expect, jest/no-conditional-expect
        expect(results).toEqual([
          {
            filePath: path.resolve(invalidJSON),
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
                source: results[0].messages[0].source, // NewLine-characters might differ depending on git-settings
              },
            ],
            errorCount: 1,
            ...(semver.satisfies(eslintPkg.version, '>= 7.32 || ^8.0.0') && {
              fatalErrorCount: 0,
            }),
            warningCount: 0,
            fixableErrorCount: 0,
            fixableWarningCount: 0,
            source: results[0].source, // NewLine-characters might differ depending on git-settings
            ...(semver.satisfies(eslintPkg.version, '>= 8.8') && {
              suppressedMessages: [],
            }),
            usedDeprecatedRules: results[0].usedDeprecatedRules, // we don't care about this one
          },
        ])
      } else {
        const results = cli.executeOnFiles([invalidJSON])
        // eslint-disable-next-line jest/valid-expect, jest/no-conditional-expect
        expect(results).toEqual({
          results: [
            {
              filePath: path.resolve(invalidJSON),
              messages: [
                {
                  column: 2,
                  endColumn: 3,
                  endLine: 1,
                  line: 1,
                  message: 'Expected a JSON object, array or literal.',
                  nodeType: results.results[0].messages[0].nodeType, // we don't care about this one
                  ruleId: 'json/*',
                  severity: 2,
                  source: results.results[0].messages[0].source, // NewLine-characters might differ depending on git-settings
                },
              ],
              errorCount: 1,
              warningCount: 0,
              fixableErrorCount: 0,
              fixableWarningCount: 0,
              source: results.results[0].source, // NewLine-characters might differ depending on git-settings
            },
          ],
          errorCount: 1,
          warningCount: 0,
          fixableErrorCount: 0,
          fixableWarningCount: 0,
          usedDeprecatedRules: results.usedDeprecatedRules, // we don't care about this one
        })
      }
    })
  })
})
