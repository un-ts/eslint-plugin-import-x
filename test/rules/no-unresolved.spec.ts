import { createRequire } from 'node:module'
import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { AST_NODE_TYPES } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  SYNTAX_VALID_CASES,
  parsers,
  testFilePath,
} from '../utils.js'
import type { GetRuleModuleMessageIds, RuleRunTests } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-unresolved'
import { CASE_SENSITIVE_FS } from 'eslint-plugin-import-x/utils'

const require = createRequire(import.meta.url)

const ruleTester = new TSESLintRuleTester()

function createError(
  messageId: GetRuleModuleMessageIds<typeof rule>,
  module: string,
  type?: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId,
    data: { module },
    type: type as AST_NODE_TYPES,
  }
}

function runResolverTests(resolver: 'node' | 'webpack') {
  const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>({
    settings: {
      'import-x/resolver': resolver,
      'import-x/cache': { lifetime: 0 },
    },
  })

  ruleTester.run(`no-unresolved (${resolver})`, rule, {
    valid: [
      tValid({
        code: 'import "./malformed.js"',
        languageOptions: { parser: require(parsers.ESPREE) },
      }),

      tValid({ code: 'import foo from "./bar";' }),
      tValid({ code: "import bar from './bar.js';" }),
      tValid({ code: "import {someThing} from './test-module';" }),
      tValid({ code: "import fs from 'fs';" }),
      tValid({
        code: "import('fs');",
        languageOptions: { parser: require(parsers.BABEL) },
      }),

      // check with eslint parser
      tValid({
        code: "import('fs');",
        languageOptions: {
          parserOptions: { ecmaVersion: 2021 },
        },
      }),

      tValid({ code: 'import * as foo from "a"' }),

      tValid({ code: 'export { foo } from "./bar"' }),
      tValid({ code: 'export * from "./bar"' }),
      tValid({ code: 'let foo; export { foo }' }),

      // stage 1 proposal for export symmetry,
      tValid({
        code: 'export * as bar from "./bar"',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tValid({
        code: 'export bar from "./bar"',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tValid({ code: 'import foo from "./jsx/MyUnCoolComponent.jsx"' }),

      // commonjs setting
      tValid({
        code: 'var foo = require("./bar")',
        options: [{ commonjs: true }],
      }),
      tValid({
        code: 'require("./bar")',
        options: [{ commonjs: true }],
      }),
      tValid({
        code: 'require("./does-not-exist")',
        options: [{ commonjs: false }],
      }),
      tValid({ code: 'require("./does-not-exist")' }),

      // amd setting
      tValid({
        code: 'require(["./bar"], function (bar) {})',
        options: [{ amd: true }],
      }),
      tValid({
        code: 'define(["./bar"], function (bar) {})',
        options: [{ amd: true }],
      }),
      tValid({
        code: 'require(["./does-not-exist"], function (bar) {})',
        options: [{ amd: false }],
      }),
      // magic modules: https://github.com/requirejs/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#magic-modules
      tValid({
        code: 'define(["require", "exports", "module"], function (r, e, m) { })',
        options: [{ amd: true }],
      }),

      // don't validate without callback param
      tValid({
        code: 'require(["./does-not-exist"])',
        options: [{ amd: true }],
      }),
      tValid({ code: 'define(["./does-not-exist"], function (bar) {})' }),

      // stress tests
      tValid({
        code: 'require("./does-not-exist", "another arg")',
        options: [{ commonjs: true, amd: true }],
      }),
      tValid({
        code: 'proxyquire("./does-not-exist")',
        options: [{ commonjs: true, amd: true }],
      }),
      tValid({
        code: '(function() {})("./does-not-exist")',
        options: [{ commonjs: true, amd: true }],
      }),
      tValid({
        code: 'define([0, foo], function (bar) {})',
        options: [{ amd: true }],
      }),
      tValid({
        code: 'require(0)',
        options: [{ commonjs: true }],
      }),
      tValid({
        code: 'require(foo)',
        options: [{ commonjs: true }],
      }),
    ],

    invalid: [
      tInvalid({
        code: 'import reallyfake from "./reallyfake/module"',
        settings: { 'import-x/ignore': [String.raw`^\./fake/`] },
        errors: [createError('unresolved', './reallyfake/module')],
      }),

      tInvalid({
        code: "import bar from './baz';",
        errors: [createError('unresolved', './baz', 'Literal')],
      }),
      tInvalid({
        code: "import bar from './empty-folder';",
        errors: [createError('unresolved', './empty-folder', 'Literal')],
      }),

      // sanity check that this module is _not_ found without proper settings
      tInvalid({
        code: "import { DEEP } from 'in-alternate-root';",
        errors: [createError('unresolved', 'in-alternate-root', 'Literal')],
      }),
      tInvalid({
        code: "import('in-alternate-root').then(function({DEEP}) {});",
        errors: [createError('unresolved', 'in-alternate-root', 'Literal')],
        languageOptions: { parser: require(parsers.BABEL) },
      }),

      tInvalid({
        code: 'export { foo } from "./does-not-exist"',
        errors: [createError('unresolved', './does-not-exist')],
      }),
      tInvalid({
        code: 'export * from "./does-not-exist"',
        errors: [createError('unresolved', './does-not-exist')],
      }),

      // check with eslint parser
      tInvalid({
        code: "import('in-alternate-root').then(function({DEEP}) {});",
        errors: [createError('unresolved', 'in-alternate-root', 'Literal')],
        languageOptions: {
          parserOptions: { ecmaVersion: 2021 },
        },
      }),

      // export symmetry proposal
      tInvalid({
        code: 'export * as bar from "./does-not-exist"',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [createError('unresolved', './does-not-exist')],
      }),
      tInvalid({
        code: 'export bar from "./does-not-exist"',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [createError('unresolved', './does-not-exist')],
      }),

      // commonjs setting
      tInvalid({
        code: 'var bar = require("./baz")',
        options: [{ commonjs: true }],
        errors: [createError('unresolved', './baz', 'Literal')],
      }),
      tInvalid({
        code: 'require("./baz")',
        options: [{ commonjs: true }],
        errors: [createError('unresolved', './baz', 'Literal')],
      }),

      // amd
      tInvalid({
        code: 'require(["./baz"], function (bar) {})',
        options: [{ amd: true }],
        errors: [createError('unresolved', './baz', 'Literal')],
      }),
      tInvalid({
        code: 'define(["./baz"], function (bar) {})',
        options: [{ amd: true }],
        errors: [createError('unresolved', './baz', 'Literal')],
      }),
      tInvalid({
        code: 'define(["./baz", "./bar", "./does-not-exist"], function (bar) {})',
        options: [{ amd: true }],
        errors: [
          createError('unresolved', './baz', 'Literal'),
          createError('unresolved', './does-not-exist', 'Literal'),
        ],
      }),
    ],
  })

  ruleTester.run(`issue #333 (${resolver})`, rule, {
    valid: [
      tValid({ code: 'import foo from "./bar.json"' }),
      tValid({ code: 'import foo from "./bar"' }),
      tValid({
        code: 'import foo from "./bar.json"',
        settings: { 'import-x/extensions': ['.js'] },
      }),
      tValid({
        code: 'import foo from "./bar"',
        settings: { 'import-x/extensions': ['.js'] },
      }),
    ],
    invalid: [
      tInvalid({
        code: 'import bar from "./foo.json"',
        errors: [createError('unresolved', './foo.json', 'Literal')],
      }),
    ],
  })

  if (!CASE_SENSITIVE_FS) {
    ruleTester.run('case sensitivity', rule, {
      valid: [
        tValid({
          // test with explicit flag
          code: 'import foo from "./jsx/MyUncoolComponent.jsx"',
          options: [{ caseSensitive: false }],
        }),
      ],

      invalid: [
        tInvalid({
          // test default
          code: 'import foo from "./jsx/MyUncoolComponent.jsx"',
          errors: [
            createError('casingMismatch', './jsx/MyUncoolComponent.jsx'),
          ],
        }),
        tInvalid({
          // test with explicit flag
          code: 'import foo from "./jsx/MyUncoolComponent.jsx"',
          options: [{ caseSensitive: true }],
          errors: [
            createError('casingMismatch', './jsx/MyUncoolComponent.jsx'),
          ],
        }),
      ],
    })

    // Windows plain absolute path is not supported by Node.js
    // TODO: add `file:` protocol support
    if (process.platform !== 'win32') {
      const relativePath = './test/fixtures/jsx/MyUnCoolComponent.jsx'
      const cwd = process.cwd()
      const mismatchedPath = path.join(cwd.toUpperCase(), relativePath)

      ruleTester.run('case sensitivity strict', rule, {
        valid: [
          // #1259 issue
          tValid({
            // caseSensitiveStrict is disabled by default
            code: `import foo from "${mismatchedPath}"`,
          }),
        ],

        invalid: [
          // #1259 issue
          tInvalid({
            // test with enabled caseSensitiveStrict option
            code: `import foo from "${mismatchedPath}"`,
            options: [{ caseSensitiveStrict: true }],
            errors: [createError('casingMismatch', mismatchedPath)],
          }),
          tInvalid({
            // test with enabled caseSensitiveStrict option and disabled caseSensitive
            code: `import foo from "${mismatchedPath}"`,
            options: [{ caseSensitiveStrict: true, caseSensitive: false }],
            errors: [createError('casingMismatch', mismatchedPath)],
          }),
        ],
      })
    }
  }
}

for (const resolver of ['node', 'webpack'] as const) {
  runResolverTests(resolver)
}

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('no-unresolved (import-x resolve legacy)', rule, {
  valid: [
    tValid({
      code: "import { DEEP } from 'in-alternate-root';",
      settings: {
        'import-x/resolve': {
          paths: [testFilePath('alternate-root')],
        },
      },
    }),

    tValid({
      code: "import { DEEP } from 'in-alternate-root'; import { bar } from 'src-bar';",
      settings: {
        'import-x/resolve': {
          paths: [testFilePath('src-root'), testFilePath('alternate-root')],
        },
      },
    }),

    tValid({
      code: 'import * as foo from "jsx-module/foo"',
      settings: { 'import-x/resolve': { extensions: ['.jsx'] } },
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import * as foo from "jsx-module/foo"',
      errors: [createError('unresolved', 'jsx-module/foo')],
    }),
  ],
})

ruleTester.run('no-unresolved (webpack-specific)', rule, {
  valid: [
    tValid({
      // default webpack config in fixtures/webpack.config.js knows about jsx
      code: 'import * as foo from "jsx-module/foo"',
      settings: { 'import-x/resolver': 'webpack' },
    }),
    tValid({
      // should ignore loaders
      code: 'import * as foo from "some-loader?with=args!jsx-module/foo"',
      settings: { 'import-x/resolver': 'webpack' },
    }),
  ],
  invalid: [
    tInvalid({
      // default webpack config in fixtures/webpack.config.js knows about jsx
      code: 'import * as foo from "jsx-module/foo"',
      settings: {
        'import-x/resolver': { webpack: { config: 'webpack.empty.config.js' } },
      },
      errors: [createError('unresolved', 'jsx-module/foo')],
    }),
  ],
})

ruleTester.run('no-unresolved ignore list', rule, {
  valid: [
    tValid({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),
    tValid({
      code: 'import "./test.giffy"',
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),

    tValid({
      code: 'import "./test.gif"',
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),

    tValid({
      code: 'import "./test.png"',
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import "./test.gif"',
      options: [{ ignore: ['.png$'] }],
      errors: [createError('unresolved', './test.gif')],
    }),

    tInvalid({
      code: 'import "./test.png"',
      options: [{ ignore: ['.gif$'] }],
      errors: [createError('unresolved', './test.png')],
    }),
  ],
})

ruleTester.run('no-unresolved unknown resolver', rule, {
  valid: [],

  invalid: [
    // logs resolver load error
    tInvalid({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      settings: { 'import-x/resolver': 'doesnt-exist' },
      errors: [
        // @ts-expect-error resolver error
        `Resolve error: unable to load resolver "doesnt-exist".`,
        createError('unresolved', './malformed.js'),
      ],
    }),

    // only logs resolver message once
    tInvalid({
      code: 'import "./malformed.js"; import "./fake.js"',
      settings: { 'import-x/resolver': 'doesnt-exist' },
      errors: [
        // @ts-expect-error resolver error
        `Resolve error: unable to load resolver "doesnt-exist".`,
        createError('unresolved', './malformed.js'),
        createError('unresolved', './fake.js'),
      ],
    }),
  ],
})

ruleTester.run('no-unresolved electron', rule, {
  valid: [
    tValid({
      code: 'import "electron"',
      settings: { 'import-x/core-modules': ['electron'] },
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import "electron"',
      errors: [createError('unresolved', 'electron')],
    }),
  ],
})

ruleTester.run('no-unresolved syntax verification', rule, {
  valid: SYNTAX_VALID_CASES as RuleRunTests<typeof rule>['valid'],
  invalid: [],
})

// https://github.com/import-js/eslint-plugin-import-x/issues/2024
ruleTester.run('import() with built-in parser', rule, {
  valid: [
    tValid({
      code: "import('fs');",
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
    }),
  ],
  invalid: [
    tInvalid({
      code: 'import("./does-not-exist-l0w9ssmcqy9").then(() => {})',
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
      errors: [createError('unresolved', './does-not-exist-l0w9ssmcqy9')],
    }),
  ],
})

describe('TypeScript', () => {
  // Type-only imports were added in TypeScript ESTree 2.23.0
  ruleTester.run('no-unresolved (ignore type-only)', rule, {
    valid: [
      tValid({
        code: 'import type { JSONSchema7Type } from "@types/json-schema";',
      }),
      tValid({
        code: 'export type { JSONSchema7Type } from "@types/json-schema";',
      }),
    ],
    invalid: [
      tInvalid({
        code: 'import { JSONSchema7Type } from "@types/json-schema";',
        errors: [createError('unresolved', '@types/json-schema')],
      }),
      tInvalid({
        code: 'export { JSONSchema7Type } from "@types/json-schema";',
        errors: [createError('unresolved', '@types/json-schema')],
      }),
    ],
  })
})
