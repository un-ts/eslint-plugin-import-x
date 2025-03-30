import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils.js'

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

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('extensions', rule, {
  valid: [
    tValid({ code: 'import a from "@/a"' }),
    tValid({ code: 'import a from "a"' }),
    tValid({ code: 'import dot from "./file.with.dot"' }),
    tValid({
      code: 'import a from "a/index.js"',
      options: ['always'],
    }),
    tValid({
      code: 'import dot from "./file.with.dot.js"',
      options: ['always'],
    }),
    tValid({
      code: [
        'import a from "a"',
        'import packageConfig from "./package.json"',
      ].join('\n'),
      options: [{ json: 'always', js: 'never' }],
    }),
    tValid({
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

    tValid({
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

    tValid({
      code: ['import bar from "./bar.js"', 'import pack from "./package"'].join(
        '\n',
      ),
      options: ['never', { js: 'always', json: 'never' }],
      settings: { 'import-x/resolve': { extensions: ['.js', '.json'] } },
    }),

    // unresolved (#271/#295)
    tValid({ code: 'import path from "path"' }),
    tValid({ code: 'import path from "path"', options: ['never'] }),
    tValid({ code: 'import path from "path"', options: ['always'] }),
    tValid({ code: 'import thing from "./fake-file.js"', options: ['always'] }),
    tValid({ code: 'import thing from "non-package"', options: ['never'] }),

    tValid({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      options: ['ignorePackages'],
    }),

    tValid({
      code: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
      options: ['always', { ignorePackages: true }],
    }),

    tValid({
      code: `
        import foo from './foo'
        import bar from './bar'
        import Component from './Component'
        import express from 'express'
      `,
      options: ['never', { ignorePackages: true }],
    }),

    tValid({
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
    tValid({
      code: ['export { foo } from "./foo.js"', 'let bar; export { bar }'].join(
        '\n',
      ),
      options: ['always'],
    }),
    tValid({
      code: ['export { foo } from "./foo"', 'let bar; export { bar }'].join(
        '\n',
      ),
      options: ['never'],
    }),

    // Root packages should be ignored and they are names not files
    tValid({
      code: [
        'import lib from "pkg.js"',
        'import lib2 from "pgk/package"',
        'import lib3 from "@name/pkg.js"',
      ].join('\n'),
      options: ['never'],
    }),

    // Query strings.
    tValid({
      code: 'import bare from "./foo?a=True.ext"',
      options: ['never'],
    }),
    tValid({
      code: 'import bare from "./foo.js?a=True"',
      options: ['always'],
    }),

    tValid({
      code: [
        'import lib from "pkg"',
        'import lib2 from "pgk/package.js"',
        'import lib3 from "@name/pkg"',
      ].join('\n'),
      options: ['always'],
    }),
  ],

  invalid: [
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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

    tInvalid({
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

    tInvalid({
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

    tInvalid({
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
    tInvalid({
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
    tInvalid({
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

    tInvalid({
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

    tInvalid({
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

    tInvalid({
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

    tInvalid({
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

    tInvalid({
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

    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
    tInvalid({
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
      tValid({
        code: 'import type T from "./typescript-declare";',
        options: [
          'always',
          { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
        ],
      }),
      tValid({
        code: 'export type { MyType } from "./typescript-declare";',
        options: [
          'always',
          { ts: 'never', tsx: 'never', js: 'never', jsx: 'never' },
        ],
      }),
    ],
    invalid: [
      tInvalid({
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
      tInvalid({
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
      tInvalid({
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
      tInvalid({
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
      tValid({
        code: 'import type { MyType } from "./typescript-declare.ts";',
        options: ['always', { checkTypeImports: true }],
      }),
      tValid({
        code: 'export type { MyType } from "./typescript-declare.ts";',
        options: ['always', { checkTypeImports: true }],
      }),
    ],
    invalid: [
      tInvalid({
        code: 'import type { MyType } from "./typescript-declare";',
        errors: [
          {
            messageId: 'missing',
            data: { importPath: './typescript-declare' },
          },
        ],
        options: ['always', { checkTypeImports: true }],
      }),
      tInvalid({
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
