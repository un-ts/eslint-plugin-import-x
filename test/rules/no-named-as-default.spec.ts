import { cjsRequire as require } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { AST_NODE_TYPES } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  SYNTAX_VALID_CASES,
  parsers,
} from '../utils.js'
import type { GetRuleModuleMessageIds, RuleRunTests } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-named-as-default'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createDefaultError(
  name: string,
  type: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'default',
    data: { name },
    type: type as AST_NODE_TYPES,
  }
}

ruleTester.run('no-named-as-default', rule, {
  valid: [
    // https://github.com/un-ts/eslint-plugin-import-x/issues/123
    tValid({
      code: `/** TypeScript */ import klawSync from "klaw-sync";`,
      settings: {
        'import-x/extensions': [
          '.ts',
          '.cts',
          '.mts',
          '.tsx',
          '.js',
          '.cjs',
          '.mjs',
          '.jsx',
        ],
        'import-x/external-module-folders': [
          'node_modules',
          'node_modules/@types',
        ],
        'import-x/parsers': {
          '@typescript-eslint/parser': ['.ts', '.cts', '.mts', '.tsx'],
        },
        'import-x/resolver': {
          typescript: true,
          node: {
            extensions: [
              '.ts',
              '.cts',
              '.mts',
              '.tsx',
              '.js',
              '.cjs',
              '.mjs',
              '.jsx',
            ],
          },
        },
      },
    }),

    tValid({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),

    'import bar, { foo } from "./bar";',
    'import bar, { foo } from "./empty-folder";',

    // es7
    tValid({
      code: 'export bar, { foo } from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export bar from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // #566: don't false-positive on `default` itself
    tValid({
      code: 'export default from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    tValid({
      code: 'import bar, { foo } from "./export-default-string-and-named"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),

    ...(SYNTAX_VALID_CASES as RuleRunTests<typeof rule>['valid']),
  ],

  invalid: [
    tInvalid({
      code: 'import foo from "./bar";',
      errors: [createDefaultError('foo', 'ImportDefaultSpecifier')],
    }),
    tInvalid({
      code: 'import foo, { foo as bar } from "./bar";',
      errors: [createDefaultError('foo', 'ImportDefaultSpecifier')],
    }),

    // es7
    tInvalid({
      code: 'export foo from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        // @ts-expect-error ExportDefaultSpecifier is unavailable yet
        createDefaultError('foo', 'ExportDefaultSpecifier'),
      ],
    }),
    tInvalid({
      code: 'export foo, { foo as bar } from "./bar";',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        // @ts-expect-error ExportDefaultSpecifier is unavailable yet
        createDefaultError('foo', 'ExportDefaultSpecifier'),
      ],
    }),

    tInvalid({
      code: 'import foo from "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
      errors: [
        {
          // @ts-expect-error parsing error
          message:
            "Parse errors in imported module './malformed.js': 'return' outside of function (1:1)",
          type: 'Literal' as AST_NODE_TYPES,
        },
      ],
    }),

    tInvalid({
      code: 'import foo from "./export-default-string-and-named"',
      errors: [createDefaultError('foo', 'ImportDefaultSpecifier')],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),
    tInvalid({
      code: 'import foo, { foo as bar } from "./export-default-string-and-named"',
      errors: [createDefaultError('foo', 'ImportDefaultSpecifier')],
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: { ecmaVersion: 2022 },
      },
    }),

    tInvalid({
      code: `import z from 'zod';`,
      errors: [createDefaultError('z', 'ImportDefaultSpecifier')],
    }),
  ],
})
