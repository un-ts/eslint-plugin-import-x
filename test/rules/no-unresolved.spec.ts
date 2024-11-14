import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { test, SYNTAX_VALID_CASES, parsers, testFilePath } from '../utils'
import type { ValidTestCase } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-unresolved'
import { CASE_SENSITIVE_FS } from 'eslint-plugin-import-x/utils'

const ruleTester = new TSESLintRuleTester()

function runResolverTests(resolver: 'node' | 'webpack') {
  // redefine 'test' to set a resolver
  // thus 'rest'. needed something 4-chars-long for formatting simplicity
  function rest<T extends ValidTestCase>(specs: T) {
    return test({
      ...specs,
      settings: {
        ...specs.settings,
        'import-x/resolver': resolver,
        'import-x/cache': { lifetime: 0 },
      },
    })
  }

  ruleTester.run(`no-unresolved (${resolver})`, rule, {
    valid: [
      test({
        code: 'import "./malformed.js"',
        languageOptions: { parser: require(parsers.ESPREE) },
      }),

      rest({ code: 'import foo from "./bar";' }),
      rest({ code: "import bar from './bar.js';" }),
      rest({ code: "import {someThing} from './test-module';" }),
      rest({ code: "import fs from 'fs';" }),
      rest({
        code: "import('fs');",
        languageOptions: { parser: require(parsers.BABEL) },
      }),

      // check with eslint parser
      rest({
        code: "import('fs');",
        languageOptions: {
          parserOptions: { ecmaVersion: 2021 },
        },
      }),

      rest({ code: 'import * as foo from "a"' }),

      rest({ code: 'export { foo } from "./bar"' }),
      rest({ code: 'export * from "./bar"' }),
      rest({ code: 'let foo; export { foo }' }),

      // stage 1 proposal for export symmetry,
      rest({
        code: 'export * as bar from "./bar"',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      rest({
        code: 'export bar from "./bar"',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      rest({ code: 'import foo from "./jsx/MyUnCoolComponent.jsx"' }),

      // commonjs setting
      rest({
        code: 'var foo = require("./bar")',
        options: [{ commonjs: true }],
      }),
      rest({
        code: 'require("./bar")',
        options: [{ commonjs: true }],
      }),
      rest({
        code: 'require("./does-not-exist")',
        options: [{ commonjs: false }],
      }),
      rest({ code: 'require("./does-not-exist")' }),

      // amd setting
      rest({
        code: 'require(["./bar"], function (bar) {})',
        options: [{ amd: true }],
      }),
      rest({
        code: 'define(["./bar"], function (bar) {})',
        options: [{ amd: true }],
      }),
      rest({
        code: 'require(["./does-not-exist"], function (bar) {})',
        options: [{ amd: false }],
      }),
      // magic modules: https://github.com/requirejs/requirejs/wiki/Differences-between-the-simplified-CommonJS-wrapper-and-standard-AMD-define#magic-modules
      rest({
        code: 'define(["require", "exports", "module"], function (r, e, m) { })',
        options: [{ amd: true }],
      }),

      // don't validate without callback param
      rest({
        code: 'require(["./does-not-exist"])',
        options: [{ amd: true }],
      }),
      rest({ code: 'define(["./does-not-exist"], function (bar) {})' }),

      // stress tests
      rest({
        code: 'require("./does-not-exist", "another arg")',
        options: [{ commonjs: true, amd: true }],
      }),
      rest({
        code: 'proxyquire("./does-not-exist")',
        options: [{ commonjs: true, amd: true }],
      }),
      rest({
        code: '(function() {})("./does-not-exist")',
        options: [{ commonjs: true, amd: true }],
      }),
      rest({
        code: 'define([0, foo], function (bar) {})',
        options: [{ amd: true }],
      }),
      rest({
        code: 'require(0)',
        options: [{ commonjs: true }],
      }),
      rest({
        code: 'require(foo)',
        options: [{ commonjs: true }],
      }),
    ],

    invalid: [
      rest({
        code: 'import reallyfake from "./reallyfake/module"',
        settings: { 'import-x/ignore': ['^\\./fake/'] },
        errors: [
          {
            message: "Unable to resolve path to module './reallyfake/module'.",
          },
        ],
      }),

      rest({
        code: "import bar from './baz';",
        errors: [
          {
            message: "Unable to resolve path to module './baz'.",
            type: 'Literal',
          },
        ],
      }),
      rest({
        code: "import bar from './empty-folder';",
        errors: [
          {
            message: "Unable to resolve path to module './empty-folder'.",
            type: 'Literal',
          },
        ],
      }),

      // sanity check that this module is _not_ found without proper settings
      rest({
        code: "import { DEEP } from 'in-alternate-root';",
        errors: [
          {
            message: "Unable to resolve path to module 'in-alternate-root'.",
            type: 'Literal',
          },
        ],
      }),
      rest({
        code: "import('in-alternate-root').then(function({DEEP}) {});",
        errors: [
          {
            message: "Unable to resolve path to module 'in-alternate-root'.",
            type: 'Literal',
          },
        ],
        languageOptions: { parser: require(parsers.BABEL) },
      }),

      rest({
        code: 'export { foo } from "./does-not-exist"',
        errors: ["Unable to resolve path to module './does-not-exist'."],
      }),
      rest({
        code: 'export * from "./does-not-exist"',
        errors: ["Unable to resolve path to module './does-not-exist'."],
      }),

      // check with eslint parser
      rest({
        code: "import('in-alternate-root').then(function({DEEP}) {});",
        errors: [
          {
            message: "Unable to resolve path to module 'in-alternate-root'.",
            type: 'Literal',
          },
        ],
        languageOptions: {
          parserOptions: { ecmaVersion: 2021 },
        },
      }),

      // export symmetry proposal
      rest({
        code: 'export * as bar from "./does-not-exist"',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: ["Unable to resolve path to module './does-not-exist'."],
      }),
      rest({
        code: 'export bar from "./does-not-exist"',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: ["Unable to resolve path to module './does-not-exist'."],
      }),

      // commonjs setting
      rest({
        code: 'var bar = require("./baz")',
        options: [{ commonjs: true }],
        errors: [
          {
            message: "Unable to resolve path to module './baz'.",
            type: 'Literal',
          },
        ],
      }),
      rest({
        code: 'require("./baz")',
        options: [{ commonjs: true }],
        errors: [
          {
            message: "Unable to resolve path to module './baz'.",
            type: 'Literal',
          },
        ],
      }),

      // amd
      rest({
        code: 'require(["./baz"], function (bar) {})',
        options: [{ amd: true }],
        errors: [
          {
            message: "Unable to resolve path to module './baz'.",
            type: 'Literal',
          },
        ],
      }),
      rest({
        code: 'define(["./baz"], function (bar) {})',
        options: [{ amd: true }],
        errors: [
          {
            message: "Unable to resolve path to module './baz'.",
            type: 'Literal',
          },
        ],
      }),
      rest({
        code: 'define(["./baz", "./bar", "./does-not-exist"], function (bar) {})',
        options: [{ amd: true }],
        errors: [
          {
            message: "Unable to resolve path to module './baz'.",
            type: 'Literal',
          },
          {
            message: "Unable to resolve path to module './does-not-exist'.",
            type: 'Literal',
          },
        ],
      }),
    ],
  })

  ruleTester.run(`issue #333 (${resolver})`, rule, {
    valid: [
      rest({ code: 'import foo from "./bar.json"' }),
      rest({ code: 'import foo from "./bar"' }),
      rest({
        code: 'import foo from "./bar.json"',
        settings: { 'import-x/extensions': ['.js'] },
      }),
      rest({
        code: 'import foo from "./bar"',
        settings: { 'import-x/extensions': ['.js'] },
      }),
    ],
    invalid: [
      rest({
        code: 'import bar from "./foo.json"',
        errors: ["Unable to resolve path to module './foo.json'."],
      }),
    ],
  })

  if (!CASE_SENSITIVE_FS) {
    const relativePath = './test/fixtures/jsx/MyUnCoolComponent.jsx'
    const cwd = process.cwd()
    const mismatchedPath = path
      .join(cwd.toUpperCase(), relativePath)
      .replaceAll('\\', '/')

    ruleTester.run('case sensitivity', rule, {
      valid: [
        rest({
          // test with explicit flag
          code: 'import foo from "./jsx/MyUncoolComponent.jsx"',
          options: [{ caseSensitive: false }],
        }),
      ],

      invalid: [
        rest({
          // test default
          code: 'import foo from "./jsx/MyUncoolComponent.jsx"',
          errors: [
            `Casing of ./jsx/MyUncoolComponent.jsx does not match the underlying filesystem.`,
          ],
        }),
        rest({
          // test with explicit flag
          code: 'import foo from "./jsx/MyUncoolComponent.jsx"',
          options: [{ caseSensitive: true }],
          errors: [
            `Casing of ./jsx/MyUncoolComponent.jsx does not match the underlying filesystem.`,
          ],
        }),
      ],
    })

    ruleTester.run('case sensitivity strict', rule, {
      valid: [
        // #1259 issue
        rest({
          // caseSensitiveStrict is disabled by default
          code: `import foo from "${mismatchedPath}"`,
        }),
      ],

      invalid: [
        // #1259 issue
        rest({
          // test with enabled caseSensitiveStrict option
          code: `import foo from "${mismatchedPath}"`,
          options: [{ caseSensitiveStrict: true }],
          errors: [
            `Casing of ${mismatchedPath} does not match the underlying filesystem.`,
          ],
        }),
        rest({
          // test with enabled caseSensitiveStrict option and disabled caseSensitive
          code: `import foo from "${mismatchedPath}"`,
          options: [{ caseSensitiveStrict: true, caseSensitive: false }],
          errors: [
            `Casing of ${mismatchedPath} does not match the underlying filesystem.`,
          ],
        }),
      ],
    })
  }
}

for (const resolver of ['node', 'webpack'] as const) {
  runResolverTests(resolver)
}

ruleTester.run('no-unresolved (import-x resolve legacy)', rule, {
  valid: [
    test({
      code: "import { DEEP } from 'in-alternate-root';",
      settings: {
        'import-x/resolve': {
          paths: [testFilePath('alternate-root')],
        },
      },
    }),

    test({
      code: "import { DEEP } from 'in-alternate-root'; import { bar } from 'src-bar';",
      settings: {
        'import-x/resolve': {
          paths: [testFilePath('src-root'), testFilePath('alternate-root')],
        },
      },
    }),

    test({
      code: 'import * as foo from "jsx-module/foo"',
      settings: { 'import-x/resolve': { extensions: ['.jsx'] } },
    }),
  ],

  invalid: [
    test({
      code: 'import * as foo from "jsx-module/foo"',
      errors: ["Unable to resolve path to module 'jsx-module/foo'."],
    }),
  ],
})

ruleTester.run('no-unresolved (webpack-specific)', rule, {
  valid: [
    test({
      // default webpack config in fixtures/webpack.config.js knows about jsx
      code: 'import * as foo from "jsx-module/foo"',
      settings: { 'import-x/resolver': 'webpack' },
    }),
    test({
      // should ignore loaders
      code: 'import * as foo from "some-loader?with=args!jsx-module/foo"',
      settings: { 'import-x/resolver': 'webpack' },
    }),
  ],
  invalid: [
    test({
      // default webpack config in fixtures/webpack.config.js knows about jsx
      code: 'import * as foo from "jsx-module/foo"',
      settings: {
        'import-x/resolver': { webpack: { config: 'webpack.empty.config.js' } },
      },
      errors: ["Unable to resolve path to module 'jsx-module/foo'."],
    }),
  ],
})

ruleTester.run('no-unresolved ignore list', rule, {
  valid: [
    test({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),
    test({
      code: 'import "./test.giffy"',
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),

    test({
      code: 'import "./test.gif"',
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),

    test({
      code: 'import "./test.png"',
      options: [{ ignore: ['.png$', '.gif$'] }],
    }),
  ],

  invalid: [
    test({
      code: 'import "./test.gif"',
      options: [{ ignore: ['.png$'] }],
      errors: ["Unable to resolve path to module './test.gif'."],
    }),

    test({
      code: 'import "./test.png"',
      options: [{ ignore: ['.gif$'] }],
      errors: ["Unable to resolve path to module './test.png'."],
    }),
  ],
})

ruleTester.run('no-unresolved unknown resolver', rule, {
  valid: [],

  invalid: [
    // logs resolver load error
    test({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.BABEL) },
      settings: { 'import-x/resolver': 'doesnt-exist' },
      errors: [
        `Resolve error: unable to load resolver "doesnt-exist".`,
        `Unable to resolve path to module './malformed.js'.`,
      ],
    }),

    // only logs resolver message once
    test({
      code: 'import "./malformed.js"; import "./fake.js"',
      settings: { 'import-x/resolver': 'doesnt-exist' },
      errors: [
        `Resolve error: unable to load resolver "doesnt-exist".`,
        `Unable to resolve path to module './malformed.js'.`,
        `Unable to resolve path to module './fake.js'.`,
      ],
    }),
  ],
})

ruleTester.run('no-unresolved electron', rule, {
  valid: [
    test({
      code: 'import "electron"',
      settings: { 'import-x/core-modules': ['electron'] },
    }),
  ],
  invalid: [
    test({
      code: 'import "electron"',
      errors: [`Unable to resolve path to module 'electron'.`],
    }),
  ],
})

ruleTester.run('no-unresolved syntax verification', rule, {
  valid: SYNTAX_VALID_CASES,
  invalid: [],
})

// https://github.com/import-js/eslint-plugin-import-x/issues/2024
ruleTester.run('import() with built-in parser', rule, {
  valid: [
    test({
      code: "import('fs');",
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
    }),
  ],
  invalid: [
    test({
      code: 'import("./does-not-exist-l0w9ssmcqy9").then(() => {})',
      languageOptions: { parserOptions: { ecmaVersion: 2021 } },
      errors: [
        "Unable to resolve path to module './does-not-exist-l0w9ssmcqy9'.",
      ],
    }),
  ],
})

describe('TypeScript', () => {
  // Type-only imports were added in TypeScript ESTree 2.23.0
  ruleTester.run('no-unresolved (ignore type-only)', rule, {
    valid: [
      test({
        code: 'import type { JSONSchema7Type } from "@types/json-schema";',
      }),
      test({
        code: 'export type { JSONSchema7Type } from "@types/json-schema";',
      }),
    ],
    invalid: [
      test({
        code: 'import { JSONSchema7Type } from "@types/json-schema";',
        errors: ["Unable to resolve path to module '@types/json-schema'."],
      }),
      test({
        code: 'export { JSONSchema7Type } from "@types/json-schema";',
        errors: ["Unable to resolve path to module '@types/json-schema'."],
      }),
    ],
  })
})
