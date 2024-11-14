import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import {
  createRuleTestCaseFunction,
  SYNTAX_VALID_CASES,
  parsers,
} from '../utils'
import type { RunTests } from '../utils'

import rule from 'eslint-plugin-import-x/rules/default'
import { CASE_SENSITIVE_FS } from 'eslint-plugin-import-x/utils'

const ruleTester = new TSESLintRuleTester()

const test = createRuleTestCaseFunction<typeof rule>()

ruleTester.run('default', rule, {
  valid: [
    test({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),

    test({ code: 'import foo from "./empty-folder";' }),
    test({ code: 'import { foo } from "./default-export";' }),
    test({ code: 'import foo from "./default-export";' }),
    test({ code: 'import foo from "./mixed-exports";' }),
    test({
      code: 'import bar from "./default-export";',
    }),
    test({
      code: 'import CoolClass from "./default-class";',
    }),
    test({
      code: 'import bar, { baz } from "./default-export";',
    }),

    // core modules always have a default
    test({ code: 'import crypto from "crypto";' }),

    test({
      code: 'import common from "./common";',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // es7 export syntax
    test({
      code: 'export bar from "./bar"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({ code: 'export { default as bar } from "./bar"' }),
    test({
      code: 'export bar, { foo } from "./bar"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({ code: 'export { default as bar, foo } from "./bar"' }),
    test({
      code: 'export bar, * as names from "./bar"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // sanity check
    test({ code: 'export {a} from "./named-exports"' }),
    test({
      code: 'import twofer from "./trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // jsx
    test({
      code: 'import MyCoolComponent from "./jsx/MyCoolComponent.jsx"',
      languageOptions: {
        parserOptions: {
          sourceType: 'module',
          ecmaVersion: 6,
          ecmaFeatures: { jsx: true },
        },
      },
    }),

    // #54: import of named export default
    test({ code: 'import foo from "./named-default-export"' }),

    // #94: redux export of execution result,
    test({ code: 'import connectedApp from "./redux"' }),
    test({
      code: 'import App from "./jsx/App"',
      languageOptions: {
        parserOptions: {
          ecmaFeatures: { jsx: true, modules: true },
        },
      },
    }),

    // from no-errors
    test({
      code: "import Foo from './jsx/FooES7.js';",
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // #545: more ES7 cases
    test({
      code: "import bar from './default-export-from.js';",
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: "import bar from './default-export-from-named.js';",
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: "import bar from './default-export-from-ignored.js';",
      settings: { 'import-x/ignore': ['common'] },
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    test({
      code: "export bar from './default-export-from-ignored.js';",
      settings: { 'import-x/ignore': ['common'] },
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    test({
      code: 'export { "default" as bar } from "./bar"',
      languageOptions: {
        parser: require(parsers.ESPREE),
        parserOptions: {
          ecmaVersion: 2022,
        },
      },
    }),

    ...(SYNTAX_VALID_CASES as RunTests<typeof rule>['valid']),
  ],

  invalid: [
    // test({
    //   code: "import Foo from './jsx/FooES7.js';",
    //   errors: [
    //     "Parse errors in imported module './jsx/FooES7.js': Unexpected token = (6:14)",
    //   ],
    // }),

    test({
      code: 'import baz from "./named-exports";',
      errors: [
        {
          messageId: 'noDefaultExport',
          data: {
            module: './named-exports',
          },
        },
      ],
    }),

    // es7 export syntax
    test({
      code: 'export baz from "./named-exports"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          messageId: 'noDefaultExport',
          data: {
            module: './named-exports',
          },
        },
      ],
    }),
    test({
      code: 'export baz, { bar } from "./named-exports"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          messageId: 'noDefaultExport',
          data: {
            module: './named-exports',
          },
        },
      ],
    }),
    test({
      code: 'export baz, * as names from "./named-exports"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          messageId: 'noDefaultExport',
          data: {
            module: './named-exports',
          },
        },
      ],
    }),
    // exports default from a module with no default
    test({
      code: 'import twofer from "./broken-trampoline"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        {
          messageId: 'noDefaultExport',
          data: {
            module: './broken-trampoline',
          },
        },
      ],
    }),

    // #328: * exports do not include default
    test({
      code: 'import barDefault from "./re-export"',
      errors: [
        {
          messageId: 'noDefaultExport',
          data: {
            module: './re-export',
          },
        },
      ],
    }),
  ],
})

// #311: import of mismatched case
if (!CASE_SENSITIVE_FS) {
  ruleTester.run('default (path case-insensitivity)', rule, {
    valid: [
      test({
        code: 'import foo from "./jsx/MyUncoolComponent.jsx"',
      }),
    ],
    invalid: [
      test({
        code: 'import bar from "./Named-Exports"',
        errors: [
          {
            messageId: 'noDefaultExport',
            data: {
              module: './Named-Exports',
            },
          },
        ],
      }),
    ],
  })
}

describe('TypeScript', () => {
  ruleTester.run(`default`, rule, {
    valid: [
      test({
        code: `import foobar from "./typescript-default"`,
        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
      }),
      test({
        code: `import foobar from "./typescript-export-assign-default"`,
        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
      }),
      test({
        code: `import foobar from "./typescript-export-assign-function"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
      }),
      test({
        code: `import foobar from "./typescript-export-assign-mixed"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
      }),
      test({
        code: `import foobar from "./typescript-export-assign-default-reexport"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
      }),
      test({
        code: `import React from "./typescript-export-assign-default-namespace"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
        languageOptions: {
          parserOptions: {
            tsconfigRootDir: path.resolve(
              __dirname,
              '../fixtures/typescript-export-assign-default-namespace/',
            ),
          },
        },
      }),
      test({
        code: `import Foo from "./typescript-export-as-default-namespace"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },

        languageOptions: {
          parserOptions: {
            tsconfigRootDir: path.resolve(
              __dirname,
              '../fixtures/typescript-export-as-default-namespace/',
            ),
          },
        },
      }),
      test({
        code: `import Foo from "./typescript-export-react-test-renderer"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
        languageOptions: {
          parserOptions: {
            tsconfigRootDir: path.resolve(
              __dirname,
              '../fixtures/typescript-export-react-test-renderer/',
            ),
          },
        },
      }),
      test({
        code: `import Foo from "./typescript-extended-config"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
        languageOptions: {
          parserOptions: {
            tsconfigRootDir: path.resolve(
              __dirname,
              '../fixtures/typescript-extended-config/',
            ),
          },
        },
      }),
      test({
        code: `import foobar from "./typescript-export-assign-property"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
      }),
    ],

    invalid: [
      test({
        code: `import foobar from "./typescript"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
        errors: [
          {
            messageId: 'noDefaultExport',
            data: {
              module: './typescript',
            },
          },
        ],
      }),
      test({
        code: `import React from "./typescript-export-assign-default-namespace"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
        errors: [
          {
            messageId: 'noDefaultExport',
            data: {
              module: './typescript-export-assign-default-namespace',
            },
          },
        ],
      }),
      test({
        code: `import FooBar from "./typescript-export-as-default-namespace"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
        errors: [
          {
            messageId: 'noDefaultExport',
            data: {
              module: './typescript-export-as-default-namespace',
            },
          },
        ],
      }),
      test({
        code: `import Foo from "./typescript-export-as-default-namespace"`,

        settings: {
          'import-x/parsers': { [parsers.TS]: ['.ts'] },
          'import-x/resolver': { 'eslint-import-resolver-typescript': true },
        },
        languageOptions: {
          parserOptions: {
            tsconfigRootDir: path.resolve(
              __dirname,
              '../fixtures/typescript-no-compiler-options/',
            ),
          },
        },
        errors: [
          {
            messageId: 'noDefaultExport',
            data: {
              module: './typescript-export-as-default-namespace',
            },
            line: 1,
            column: 8,
            endLine: 1,
            endColumn: 11,
          },
        ],
      }),
    ],
  })
})
