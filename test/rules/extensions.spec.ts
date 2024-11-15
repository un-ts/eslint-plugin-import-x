import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunction, testFilePath } from '../utils'

import rule from 'eslint-plugin-import-x/rules/extensions'

const ruleTester = new TSESLintRuleTester()
const ruleTesterWithTypeScriptImports = new TSESLintRuleTester({
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
})

const test = createRuleTestCaseFunction<typeof rule>()

ruleTester.run('extensions', rule, {
  valid: [
    test({ code: 'import a from "@/a"' }),
    test({ code: 'import a from "a"' }),
    test({ code: 'import dot from "./file.with.dot"' }),
    test({
      code: 'import a from "a/index.js"',
      options: ['always'],
    }),
    test({
      code: 'import dot from "./file.with.dot.js"',
      options: ['always'],
    }),
    test({
      code: [
        'import a from "a"',
        'import packageConfig from "./package.json"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never' }],
    }),
    test({
      code: [
        'import lib from "./bar"',
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: ['never'],
      settings: {
        'import-x/resolve': { extensions: ['.js', '.jsx', '.json'] },
      },
    }),

    test({
      code: [
        'import bar from "./bar"',
        'import barjson from "./bar.json"',
        'import barhbs from "./bar.hbs"',
      ].join('\n'),
      options: ['always', { js: 'never', jsx: 'never' }],
      settings: {
        'import-x/resolve': { extensions: ['.js', '.jsx', '.json', '.hbs'] },
      },
    }),

    test({
      code: ['import bar from "./bar.js"', 'import pack from "./package"'].join(
        '\n',
      ),
      options: ['never', { js: 'always', json: 'never' }],
      settings: { 'import-x/resolve': { extensions: ['.js', '.json'] } },
    }),

    // unresolved (#271/#295)
    test({ code: 'import path from "path"' }),
    test({ code: 'import path from "path"', options: ['never'] }),
    test({ code: 'import path from "path"', options: ['always'] }),
    test({ code: 'import thing from "./fake-file.js"', options: ['always'] }),
    test({ code: 'import thing from "non-package"', options: ['never'] }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      options: ['ignorePackages'],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      options: ['always', { ignorePackages: true }],
    }),

    test({
      code: `
        import foo from './foo'
        import bar from './bar'
        import Component from './Component'
        import express from 'express'
      `,
      options: ['never', { ignorePackages: true }],
    }),

    test({
      code: 'import exceljs from "exceljs"',
      options: ['always', { js: 'never', jsx: 'never' }],
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      settings: {
        'import-x/resolver': {
          node: { extensions: ['.js', '.jsx', '.json'] },
          webpack: { config: 'webpack.empty.config.js' },
        },
      },
    }),

    // export (#964)
    test({
      code: ['export { foo } from "./foo.js"', 'let bar; export { bar }'].join(
        '\n',
      ),
      options: ['always'],
    }),
    test({
      code: ['export { foo } from "./foo"', 'let bar; export { bar }'].join(
        '\n',
      ),
      options: ['never'],
    }),

    // Root packages should be ignored and they are names not files
    test({
      code: [
        'import lib from "pkg.js"',
        'import lib2 from "pgk/package"',
        'import lib3 from "@name/pkg.js"',
      ].join('\n'),
      options: ['never'],
    }),

    // Query strings.
    test({
      code: 'import bare from "./foo?a=True.ext"',
      options: ['never'],
    }),
    test({
      code: 'import bare from "./foo.js?a=True"',
      options: ['always'],
    }),

    test({
      code: [
        'import lib from "pkg"',
        'import lib2 from "pgk/package.js"',
        'import lib3 from "@name/pkg"',
      ].join('\n'),
      options: ['always'],
    }),
  ],

  invalid: [
    test({
      code: 'import a from "a/index.js"',
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: 'a/index.js' },
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
      code: 'import dot from "./file.with.dot"',
      options: ['always'],
      errors: [
        {
          messageId: 'missingKnown',
          data: { extension: 'js', importPath: './file.with.dot' },
          line: 1,
          column: 17,
        },
      ],
    }),
    test({
      code: [
        'import a from "a/index.js"',
        'import packageConfig from "./package"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never' }],
      settings: { 'import-x/resolve': { extensions: ['.js', '.json'] } },
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: 'a/index.js' },
          line: 1,
          column: 15,
        },
        {
          messageId: 'missingKnown',
          data: { extension: 'json', importPath: './package' },
          line: 2,
          column: 27,
        },
      ],
    }),
    test({
      code: [
        'import lib from "./bar.js"',
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: ['never'],
      settings: {
        'import-x/resolve': { extensions: ['.js', '.jsx', '.json'] },
      },
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './bar.js' },
          line: 1,
          column: 17,
        },
      ],
    }),
    test({
      code: [
        'import lib from "./bar.js"',
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never', jsx: 'never' }],
      settings: {
        'import-x/resolve': { extensions: ['.js', '.jsx', '.json'] },
      },
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './bar.js' },
          line: 1,
          column: 17,
        },
      ],
    }),
    // extension resolve order (#583/#965)
    test({
      code: [
        'import component from "./bar.jsx"',
        'import data from "./bar.json"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never', jsx: 'never' }],
      settings: {
        'import-x/resolve': { extensions: ['.jsx', '.json', '.js'] },
      },
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'jsx', importPath: './bar.jsx' },
          line: 1,
          column: 23,
        },
      ],
    }),
    test({
      code: 'import "./bar.coffee"',
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'coffee', importPath: './bar.coffee' },
          line: 1,
          column: 8,
        },
      ],
      options: ['never', { js: 'always', jsx: 'always' }],
      settings: { 'import-x/resolve': { extensions: ['.coffee', '.js'] } },
    }),

    test({
      code: [
        'import barjs from "./bar.js"',
        'import barjson from "./bar.json"',
        'import barnone from "./bar"',
      ].join('\n'),
      options: ['always', { json: 'always', js: 'never', jsx: 'never' }],
      settings: {
        'import-x/resolve': { extensions: ['.js', '.jsx', '.json'] },
      },
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './bar.js' },
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: ['import barjs from "."', 'import barjs2 from ".."'].join('\n'),
      options: ['always'],
      errors: [
        {
          messageId: 'missingKnown',
          data: { extension: 'js', importPath: '.' },
          line: 1,
          column: 19,
        },
        {
          messageId: 'missingKnown',
          data: { extension: 'js', importPath: '..' },
          line: 2,
          column: 20,
        },
      ],
    }),

    test({
      code: [
        'import barjs from "./bar.js"',
        'import barjson from "./bar.json"',
        'import barnone from "./bar"',
      ].join('\n'),
      options: ['never', { json: 'always', js: 'never', jsx: 'never' }],
      settings: {
        'import-x/resolve': { extensions: ['.js', '.jsx', '.json'] },
      },
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './bar.js' },
          line: 1,
          column: 19,
        },
      ],
    }),

    // unresolved (#271/#295)
    test({
      code: 'import thing from "./fake-file.js"',
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './fake-file.js' },
          line: 1,
          column: 19,
        },
      ],
    }),
    test({
      code: 'import thing from "non-package/test"',
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: 'non-package/test' },
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: 'import thing from "@name/pkg/test"',
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: '@name/pkg/test' },
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: 'import thing from "@name/pkg/test.js"',
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: '@name/pkg/test.js' },
          line: 1,
          column: 19,
        },
      ],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component'
        import baz from 'foo/baz'
        import baw from '@scoped/baw/import'
        import chart from '@/configs/chart'
        import express from 'express'
      `,
      options: ['always', { ignorePackages: true }],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: './Component' },
          line: 4,
          column: 31,
        },
        {
          messageId: 'missing',
          data: { importPath: '@/configs/chart' },
          line: 7,
          column: 27,
        },
      ],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component'
        import baz from 'foo/baz'
        import baw from '@scoped/baw/import'
        import chart from '@/configs/chart'
        import express from 'express'
      `,
      options: ['ignorePackages'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: './Component' },
          line: 4,
          column: 31,
        },
        {
          messageId: 'missing',
          data: { importPath: '@/configs/chart' },
          line: 7,
          column: 27,
        },
      ],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },

          line: 2,
          column: 25,
        },
        {
          messageId: 'unexpected',
          data: { extension: 'jsx', importPath: './Component.jsx' },
          line: 4,
          column: 31,
        },
      ],
      options: ['never', { ignorePackages: true }],
    }),

    test({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
      `,
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'jsx', importPath: './Component.jsx' },
          line: 4,
          column: 31,
        },
      ],
      options: ['always', { pattern: { jsx: 'never' } }],
    }),

    // export (#964)
    test({
      code: ['export { foo } from "./foo"', 'let bar; export { bar }'].join(
        '\n',
      ),
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: './foo' },
          line: 1,
          column: 21,
        },
      ],
    }),
    test({
      code: ['export { foo } from "./foo.js"', 'let bar; export { bar }'].join(
        '\n',
      ),
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },
          line: 1,
          column: 21,
        },
      ],
    }),

    // Query strings.
    test({
      code: 'import withExtension from "./foo.js?a=True"',
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js?a=True' },
          line: 1,
          column: 27,
        },
      ],
    }),
    test({
      code: 'import withoutExtension from "./foo?a=True.ext"',
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: './foo?a=True.ext' },
          line: 1,
          column: 30,
        },
      ],
    }),

    // require (#1230)
    test({
      code: ['const { foo } = require("./foo")', 'export { foo }'].join('\n'),
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: './foo' },
          line: 1,
          column: 25,
        },
      ],
    }),
    test({
      code: ['const { foo } = require("./foo.js")', 'export { foo }'].join(
        '\n',
      ),
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },
          line: 1,
          column: 25,
        },
      ],
    }),

    // export { } from
    test({
      code: 'export { foo } from "./foo"',
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: './foo' },
          line: 1,
          column: 21,
        },
      ],
    }),
    test({
      code: `
        import foo from "@/ImNotAScopedModule";
        import chart from '@/configs/chart';
      `,
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: '@/ImNotAScopedModule' },
          line: 2,
        },
        {
          messageId: 'missing',
          data: { importPath: '@/configs/chart' },
          line: 3,
        },
      ],
    }),
    test({
      code: 'export { foo } from "./foo.js"',
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },
          line: 1,
          column: 21,
        },
      ],
    }),

    // export * from
    test({
      code: 'export * from "./foo"',
      options: ['always'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: './foo' },
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
      code: 'export * from "./foo.js"',
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },

          line: 1,
          column: 15,
        },
      ],
    }),
    test({
      code: 'import foo from "@/ImNotAScopedModule.js"',
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: '@/ImNotAScopedModule.js' },

          line: 1,
        },
      ],
    }),
    test({
      code: `
        import _ from 'lodash';
        import m from '@test-scope/some-module/index.js';

        import bar from './bar';
      `,
      options: ['never'],
      settings: {
        'import-x/resolver': 'webpack',
        'import-x/external-module-folders': [
          'node_modules',
          'symlinked-module',
        ],
      },
      errors: [
        {
          messageId: 'unexpected',
          data: {
            extension: 'js',
            importPath: '@test-scope/some-module/index.js',
          },
          line: 3,
        },
      ],
    }),

    // TODO: properly ignore packages resolved via relative imports
    test({
      code: ['import * as test from "."'].join('\n'),
      filename: testFilePath('./internal-modules/test.js'),
      options: ['ignorePackages'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: '.' },
          line: 1,
        },
      ],
    }),
    // TODO: properly ignore packages resolved via relative imports
    test({
      code: ['import * as test from ".."'].join('\n'),
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: ['ignorePackages'],
      errors: [
        {
          messageId: 'missing',
          data: { importPath: '..' },
          line: 1,
        },
      ],
    }),
  ],
})

describe('TypeScript', () => {
  ruleTester.run(`typescript - extensions ignore type-only`, rule, {
    valid: [
      test({
        code: 'import type T from "./typescript-declare";',
        options: [
          'always',
          { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
        ],
      }),
      test({
        code: 'export type { MyType } from "./typescript-declare";',
        options: [
          'always',
          { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
        ],
      }),
    ],
    invalid: [
      test({
        code: 'import T from "./typescript-declare";',
        errors: [
          {
            messageId: 'missing',
            data: { importPath: './typescript-declare' },
          },
        ],
        options: [
          'always',
          { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
        ],
      }),
      test({
        code: 'export { MyType } from "./typescript-declare";',
        errors: [
          {
            messageId: 'missing',
            data: { importPath: './typescript-declare' },
          },
        ],
        options: [
          'always',
          { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
        ],
      }),
      test({
        code: 'import type T from "./typescript-declare";',
        errors: [
          {
            messageId: 'missing',
            data: { importPath: './typescript-declare' },
          },
        ],
        options: [
          'always',
          {
            pattern: {
              ts: 'never',
              tsx: 'never',
              js: 'never',
              jsx: 'never',
            },
            checkTypeImports: true,
          },
        ],
      }),
      test({
        code: 'export type { MyType } from "./typescript-declare";',
        errors: [
          {
            messageId: 'missing',
            data: { importPath: './typescript-declare' },
          },
        ],
        options: [
          'always',
          {
            pattern: {
              ts: 'never',
              tsx: 'never',
              js: 'never',
              jsx: 'never',
            },
            checkTypeImports: true,
          },
        ],
      }),
    ],
  })

  ruleTesterWithTypeScriptImports.run('extensions', rule, {
    valid: [
      test({
        code: 'import type { MyType } from "./typescript-declare.ts";',
        options: ['always', { checkTypeImports: true }],
      }),
      test({
        code: 'export type { MyType } from "./typescript-declare.ts";',
        options: ['always', { checkTypeImports: true }],
      }),
    ],
    invalid: [
      test({
        code: 'import type { MyType } from "./typescript-declare";',
        errors: [
          {
            messageId: 'missing',
            data: { importPath: './typescript-declare' },
          },
        ],
        options: ['always', { checkTypeImports: true }],
      }),
      test({
        code: 'export type { MyType } from "./typescript-declare";',
        errors: [
          {
            messageId: 'missing',
            data: { importPath: './typescript-declare' },
          },
        ],
        options: ['always', { checkTypeImports: true }],
      }),
    ],
  })
})
