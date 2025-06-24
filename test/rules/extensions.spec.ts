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

    tValid({
      code: "import foo from './foo';",
      options: [{ fix: true }],
    }),

    tValid({
      code: "import foo from './foo.js';",
      options: [{ fix: true, pattern: { js: 'always' } }],
    }),
  ],

  invalid: [
    tInvalid({
      name: 'extensions should provide suggestions by default',
      code: 'import a from "./foo.js"',
      options: ['never'],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },
          line: 1,
          column: 15,
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js',
                fixedImportPath: './foo',
              },
              output: 'import a from "./foo"',
            },
          ],
        },
      ],
    }),
    tInvalid({
      name: 'extensions should autofix when fix is set to true',
      code: 'import a from "./foo.js"',
      options: ['never', { fix: true }],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },
          line: 1,
          column: 15,
        },
      ],
      output: 'import a from "./foo"',
    }),
    tInvalid({
      name: 'extensions should autofix when fix is set to true and a pattern object is provided',
      code: 'import a from "./foo.js"',
      options: ['never', { fix: true, pattern: {} }],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },
          line: 1,
          column: 15,
        },
      ],
      output: 'import a from "./foo"',
    }),
    tInvalid({
      name: 'extensions should not autofix when fix is set to false',
      code: 'import a from "./foo.js"',
      options: ['never', { fix: false }],
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: './foo.js' },
          line: 1,
          column: 15,
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js',
                fixedImportPath: './foo',
              },
              output: 'import a from "./foo"',
            },
          ],
        },
      ],
      output: null,
    }),
    tInvalid({
      code: 'import a from "a/index.js"',
      errors: [
        {
          messageId: 'unexpected',
          data: { extension: 'js', importPath: 'a/index.js' },
          line: 1,
          column: 15,
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: 'a/index.js',
                fixedImportPath: 'a',
              },
              output: 'import a from "a"',
            },
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: 'a/index.js',
                fixedImportPath: 'a/index',
              },
              output: 'import a from "a/index"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'addMissing',
              data: {
                extension: 'js',
                importPath: './file.with.dot',
                fixedImportPath: './file.with.dot.js',
              },
              output: 'import dot from "./file.with.dot.js"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: 'a/index.js',
                fixedImportPath: 'a',
              },
              output: [
                'import a from "a"',
                'import packageConfig from "./package"',
              ].join('\n'),
            },
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: 'a/index.js',
                fixedImportPath: 'a/index',
              },
              output: [
                'import a from "a/index"',
                'import packageConfig from "./package"',
              ].join('\n'),
            },
          ],
        },
        {
          messageId: 'missingKnown',
          data: { extension: 'json', importPath: './package' },
          line: 2,
          column: 27,
          suggestions: [
            {
              messageId: 'addMissing',
              data: {
                extension: 'json',
                importPath: './package',
                fixedImportPath: './package.json',
              },
              output: [
                'import a from "a/index.js"',
                'import packageConfig from "./package.json"',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './bar.js',
                fixedImportPath: './bar',
              },
              output: [
                'import lib from "./bar"',
                'import component from "./bar.jsx"',
                'import data from "./bar.json"',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './bar.js',
                fixedImportPath: './bar',
              },
              output: [
                'import lib from "./bar"',
                'import component from "./bar.jsx"',
                'import data from "./bar.json"',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'jsx',
                importPath: './bar.jsx',
                fixedImportPath: './bar',
              },
              output: [
                'import component from "./bar"',
                'import data from "./bar.json"',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'coffee',
                importPath: './bar.coffee',
                fixedImportPath: './bar',
              },
              output: 'import "./bar"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './bar.js',
                fixedImportPath: './bar',
              },
              output: [
                'import barjs from "./bar"',
                'import barjson from "./bar.json"',
                'import barnone from "./bar"',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'addMissing',
              data: {
                extension: 'js',
                importPath: '.',
                fixedImportPath: './index.js',
              },
              output: [
                'import barjs from "./index.js"',
                'import barjs2 from ".."',
              ].join('\n'),
            },
          ],
        },
        {
          messageId: 'missingKnown',
          data: { extension: 'js', importPath: '..' },
          line: 2,
          column: 20,
          suggestions: [
            {
              messageId: 'addMissing',
              data: {
                extension: 'js',
                importPath: '..',
                fixedImportPath: '../index.js',
              },
              output: [
                'import barjs from "."',
                'import barjs2 from "../index.js"',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './bar.js',
                fixedImportPath: './bar',
              },
              output: [
                'import barjs from "./bar"',
                'import barjson from "./bar.json"',
                'import barnone from "./bar"',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './fake-file.js',
                fixedImportPath: './fake-file',
              },
              output: 'import thing from "./fake-file"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: '@name/pkg/test.js',
                fixedImportPath: '@name/pkg/test',
              },
              output: 'import thing from "@name/pkg/test"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js',
                fixedImportPath: './foo',
              },
              output: `
        import foo from './foo'
        import bar from './bar.json'
        import Component from './Component.jsx'
        import express from 'express'
      `,
            },
          ],
        },
        {
          messageId: 'unexpected',
          data: { extension: 'jsx', importPath: './Component.jsx' },
          line: 4,
          column: 31,
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'jsx',
                importPath: './Component.jsx',
                fixedImportPath: './Component',
              },
              output: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component'
        import express from 'express'
      `,
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'jsx',
                importPath: './Component.jsx',
                fixedImportPath: './Component',
              },
              output: `
        import foo from './foo.js'
        import bar from './bar.json'
        import Component from './Component'
      `,
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js',
                fixedImportPath: './foo',
              },
              output: [
                'export { foo } from "./foo"',
                'let bar; export { bar }',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js?a=True',
                fixedImportPath: './foo?a=True',
              },
              output: 'import withExtension from "./foo?a=True"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js',
                fixedImportPath: './foo',
              },
              output: [
                'const { foo } = require("./foo")',
                'export { foo }',
              ].join('\n'),
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js',
                fixedImportPath: './foo',
              },
              output: 'export { foo } from "./foo"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: './foo.js',
                fixedImportPath: './foo',
              },
              output: 'export * from "./foo"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: '@/ImNotAScopedModule.js',
                fixedImportPath: '@/ImNotAScopedModule',
              },
              output: 'import foo from "@/ImNotAScopedModule"',
            },
          ],
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
          suggestions: [
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: '@test-scope/some-module/index.js',
                fixedImportPath: '@test-scope/some-module',
              },
              output: `
        import _ from 'lodash';
        import m from '@test-scope/some-module';

        import bar from './bar';
      `,
            },
            {
              messageId: 'removeUnexpected',
              data: {
                extension: 'js',
                importPath: '@test-scope/some-module/index.js',
                fixedImportPath: '@test-scope/some-module/index',
              },
              output: `
        import _ from 'lodash';
        import m from '@test-scope/some-module/index';

        import bar from './bar';
      `,
            },
          ],
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

      // pathGroupOverrides: no patterns match good bespoke specifiers
      tValid({
        code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src.ts';
              import { $exists } from 'rootverse+bfe:src/symbols.ts';

              import type { Entries } from 'type-fest';
            `,
        options: [
          'always',
          {
            ignorePackages: true,
            checkTypeImports: true,
            pathGroupOverrides: [
              {
                pattern: 'multiverse{*,*/**}',
                action: 'enforce',
              },
            ],
          },
        ],
      }),
      // pathGroupOverrides: an enforce pattern matches good bespoke specifiers
      tValid({
        code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src.ts';
              import { $exists } from 'rootverse+bfe:src/symbols.ts';

              import type { Entries } from 'type-fest';
            `,
        options: [
          'always',
          {
            ignorePackages: true,
            checkTypeImports: true,
            pathGroupOverrides: [
              {
                pattern: 'rootverse{*,*/**}',
                action: 'enforce',
              },
            ],
          },
        ],
      }),
      // pathGroupOverrides: an ignore pattern matches bad bespoke specifiers
      tValid({
        code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src';
              import { $exists } from 'rootverse+bfe:src/symbols';

              import type { Entries } from 'type-fest';
            `,
        options: [
          'always',
          {
            ignorePackages: true,
            checkTypeImports: true,
            pathGroupOverrides: [
              {
                pattern: 'multiverse{*,*/**}',
                action: 'enforce',
              },
              {
                pattern: 'rootverse{*,*/**}',
                action: 'ignore',
              },
            ],
          },
        ],
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

      // pathGroupOverrides: an enforce pattern matches bad bespoke specifiers
      tInvalid({
        code: `
              import { ErrorMessage as UpstreamErrorMessage } from '@black-flag/core/util';

              import { $instances } from 'rootverse+debug:src';
              import { $exists } from 'rootverse+bfe:src/symbols';

              import type { Entries } from 'type-fest';
            `,
        options: [
          'always',
          {
            ignorePackages: true,
            checkTypeImports: true,
            pathGroupOverrides: [
              {
                pattern: 'rootverse{*,*/**}',
                action: 'enforce',
              },
              {
                pattern: 'universe{*,*/**}',
                action: 'ignore',
              },
            ],
          },
        ],
        errors: [
          {
            messageId: 'missing',
            data: { importPath: 'rootverse+debug:src' },
            line: 4,
          },
          {
            messageId: 'missing',
            data: { importPath: 'rootverse+bfe:src/symbols' },
            line: 5,
          },
        ],
      }),

      tInvalid({
        code: 'import foo from "./foo.js";',
        options: ['always', { pattern: { js: 'never' }, fix: true }],
        errors: [
          {
            messageId: 'unexpected',
            data: { extension: 'js', importPath: './foo.js' },
          },
        ],
        output: 'import foo from "./foo";',
      }),

      tInvalid({
        code: 'import foo from "./index.js?query#hash";',
        options: ['always', { pattern: { js: 'never' } }],
        errors: [
          {
            messageId: 'unexpected',
            data: { extension: 'js', importPath: './index.js?query#hash' },
            suggestions: [
              {
                messageId: 'removeUnexpected',
                data: {
                  extension: 'js',
                  importPath: './index.js?query#hash',
                  fixedImportPath: '.?query#hash',
                },
                output: 'import foo from ".?query#hash";',
              },
              {
                messageId: 'removeUnexpected',
                data: {
                  extension: 'js',
                  importPath: './index.js?query#hash',
                  fixedImportPath: './index?query#hash',
                },
                output: 'import foo from "./index?query#hash";',
              },
            ],
          },
        ],
      }),

      tInvalid({
        code: 'import foo from "./index.js?query#hash";',
        options: ['always', { pattern: { js: 'never' }, fix: true }],
        errors: [
          {
            messageId: 'unexpected',
            data: { extension: 'js', importPath: './index.js?query#hash' },
          },
        ],
        output: 'import foo from ".?query#hash";',
      }),

      tInvalid({
        code: 'import foo from "./?query#hash";',
        options: ['always', { pattern: { js: 'always' } }],
        errors: [
          {
            messageId: 'missingKnown',
            data: { extension: 'js', importPath: './?query#hash' },
            suggestions: [
              {
                messageId: 'addMissing',
                data: {
                  extension: 'js',
                  importPath: './?query#hash',
                  fixedImportPath: './index.js?query#hash',
                },
                output: 'import foo from "./index.js?query#hash";',
              },
            ],
          },
        ],
      }),

      tInvalid({
        code: 'import foo from "./?query#hash";',
        options: ['always', { pattern: { js: 'always' }, fix: true }],
        errors: [
          {
            messageId: 'missingKnown',
            data: { extension: 'js', importPath: './?query#hash' },
          },
        ],
        output: 'import foo from "./index.js?query#hash";',
      }),
    ],
  })
})
