import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, test } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-useless-path-segments'

const ruleTester = new TSESLintRuleTester()

function runResolverTests(resolver: 'node' | 'webpack') {
  ruleTester.run(`no-useless-path-segments (${resolver})`, rule, {
    valid: [
      // CommonJS modules with default options
      test({ code: 'require("./../fixtures/malformed.js")' }),

      // ES modules with default options
      test({ code: 'import "./malformed.js"' }),
      test({ code: 'import "./test-module"' }),
      test({ code: 'import "./bar/"' }),
      test({ code: 'import "."' }),
      test({ code: 'import ".."' }),
      test({ code: 'import fs from "fs"' }),

      // ES modules + noUselessIndex
      test({ code: 'import "../index"' }), // noUselessIndex is false by default
      test({
        code: 'import "../my-custom-index"',
        options: [{ noUselessIndex: true }],
      }),
      test({ code: 'import "./bar.js"', options: [{ noUselessIndex: true }] }), // ./bar/index.js exists
      test({ code: 'import "./bar"', options: [{ noUselessIndex: true }] }),
      test({ code: 'import "./bar/"', options: [{ noUselessIndex: true }] }), // ./bar.js exists
      test({
        code: 'import "./malformed.js"',
        options: [{ noUselessIndex: true }],
      }), // ./malformed directory does not exist
      test({
        code: 'import "./malformed"',
        options: [{ noUselessIndex: true }],
      }), // ./malformed directory does not exist
      test({
        code: 'import "./importType"',
        options: [{ noUselessIndex: true }],
      }), // ./importType.js does not exist

      test({
        code: 'import(".")',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      test({
        code: 'import("..")',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      test({
        code: 'import("fs").then(function(fs) {})',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
    ],

    invalid: [
      // CommonJS modules
      test({
        code: 'require("./../fixtures/malformed.js")',
        output: 'require("../fixtures/malformed.js")',
        options: [{ commonjs: true }],
        errors: [
          'Useless path segments for "./../fixtures/malformed.js", should be "../fixtures/malformed.js"',
        ],
      }),
      test({
        code: 'require("./../fixtures/malformed")',
        output: 'require("../fixtures/malformed")',
        options: [{ commonjs: true }],
        errors: [
          'Useless path segments for "./../fixtures/malformed", should be "../fixtures/malformed"',
        ],
      }),
      test({
        code: 'require("../fixtures/malformed.js")',
        output: 'require("./malformed.js")',
        options: [{ commonjs: true }],
        errors: [
          'Useless path segments for "../fixtures/malformed.js", should be "./malformed.js"',
        ],
      }),
      test({
        code: 'require("../fixtures/malformed")',
        output: 'require("./malformed")',
        options: [{ commonjs: true }],
        errors: [
          'Useless path segments for "../fixtures/malformed", should be "./malformed"',
        ],
      }),
      test({
        code: 'require("./test-module/")',
        output: 'require("./test-module")',
        options: [{ commonjs: true }],
        errors: [
          'Useless path segments for "./test-module/", should be "./test-module"',
        ],
      }),
      test({
        code: 'require("./")',
        output: 'require(".")',
        options: [{ commonjs: true }],
        errors: ['Useless path segments for "./", should be "."'],
      }),
      test({
        code: 'require("../")',
        output: 'require("..")',
        options: [{ commonjs: true }],
        errors: ['Useless path segments for "../", should be ".."'],
      }),
      test({
        code: 'require("./deep//a")',
        output: 'require("./deep/a")',
        options: [{ commonjs: true }],
        errors: ['Useless path segments for "./deep//a", should be "./deep/a"'],
      }),

      // CommonJS modules + noUselessIndex
      test({
        code: 'require("./bar/index.js")',
        output: 'require("./bar/")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          'Useless path segments for "./bar/index.js", should be "./bar/"',
        ], // ./bar.js exists
      }),
      test({
        code: 'require("./bar/index")',
        output: 'require("./bar/")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: ['Useless path segments for "./bar/index", should be "./bar/"'], // ./bar.js exists
      }),
      test({
        code: 'require("./importPath/")',
        output: 'require("./importPath")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          'Useless path segments for "./importPath/", should be "./importPath"',
        ], // ./importPath.js does not exist
      }),
      test({
        code: 'require("./importPath/index.js")',
        output: 'require("./importPath")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          'Useless path segments for "./importPath/index.js", should be "./importPath"',
        ], // ./importPath.js does not exist
      }),
      test({
        code: 'require("./importType/index")',
        output: 'require("./importType")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          'Useless path segments for "./importType/index", should be "./importType"',
        ], // ./importPath.js does not exist
      }),
      test({
        code: 'require("./index")',
        output: 'require(".")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: ['Useless path segments for "./index", should be "."'],
      }),
      test({
        code: 'require("../index")',
        output: 'require("..")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: ['Useless path segments for "../index", should be ".."'],
      }),
      test({
        code: 'require("../index.js")',
        output: 'require("..")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: ['Useless path segments for "../index.js", should be ".."'],
      }),

      // ES modules
      test({
        code: 'import "./../fixtures/malformed.js"',
        output: 'import "../fixtures/malformed.js"',
        errors: [
          'Useless path segments for "./../fixtures/malformed.js", should be "../fixtures/malformed.js"',
        ],
      }),
      test({
        code: 'import "./../fixtures/malformed"',
        output: 'import "../fixtures/malformed"',
        errors: [
          'Useless path segments for "./../fixtures/malformed", should be "../fixtures/malformed"',
        ],
      }),
      test({
        code: 'import "../fixtures/malformed.js"',
        output: 'import "./malformed.js"',
        errors: [
          'Useless path segments for "../fixtures/malformed.js", should be "./malformed.js"',
        ],
      }),
      test({
        code: 'import "../fixtures/malformed"',
        output: 'import "./malformed"',
        errors: [
          'Useless path segments for "../fixtures/malformed", should be "./malformed"',
        ],
      }),
      test({
        code: 'import "./test-module/"',
        output: 'import "./test-module"',
        errors: [
          'Useless path segments for "./test-module/", should be "./test-module"',
        ],
      }),
      test({
        code: 'import "./"',
        output: 'import "."',
        errors: ['Useless path segments for "./", should be "."'],
      }),
      test({
        code: 'import "../"',
        output: 'import ".."',
        errors: ['Useless path segments for "../", should be ".."'],
      }),
      test({
        code: 'import "./deep//a"',
        output: 'import "./deep/a"',
        errors: ['Useless path segments for "./deep//a", should be "./deep/a"'],
      }),

      // ES modules + noUselessIndex
      test({
        code: 'import "./bar/index.js"',
        output: 'import "./bar/"',
        options: [{ noUselessIndex: true }],
        errors: [
          'Useless path segments for "./bar/index.js", should be "./bar/"',
        ], // ./bar.js exists
      }),
      test({
        code: 'import "./bar/index"',
        output: 'import "./bar/"',
        options: [{ noUselessIndex: true }],
        errors: ['Useless path segments for "./bar/index", should be "./bar/"'], // ./bar.js exists
      }),
      test({
        code: 'import "./importPath/"',
        output: 'import "./importPath"',
        options: [{ noUselessIndex: true }],
        errors: [
          'Useless path segments for "./importPath/", should be "./importPath"',
        ], // ./importPath.js does not exist
      }),
      test({
        code: 'import "./importPath/index.js"',
        output: 'import "./importPath"',
        options: [{ noUselessIndex: true }],
        errors: [
          'Useless path segments for "./importPath/index.js", should be "./importPath"',
        ], // ./importPath.js does not exist
      }),
      test({
        code: 'import "./importPath/index"',
        output: 'import "./importPath"',
        options: [{ noUselessIndex: true }],
        errors: [
          'Useless path segments for "./importPath/index", should be "./importPath"',
        ], // ./importPath.js does not exist
      }),
      test({
        code: 'import "./index"',
        output: 'import "."',
        options: [{ noUselessIndex: true }],
        errors: ['Useless path segments for "./index", should be "."'],
      }),
      test({
        code: 'import "../index"',
        output: 'import ".."',
        options: [{ noUselessIndex: true }],
        errors: ['Useless path segments for "../index", should be ".."'],
      }),
      test({
        code: 'import "../index.js"',
        output: 'import ".."',
        options: [{ noUselessIndex: true }],
        errors: ['Useless path segments for "../index.js", should be ".."'],
      }),
      test({
        code: 'import("./")',
        output: 'import(".")',
        errors: ['Useless path segments for "./", should be "."'],
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      test({
        code: 'import("../")',
        output: 'import("..")',
        errors: ['Useless path segments for "../", should be ".."'],
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      test({
        code: 'import("./deep//a")',
        output: 'import("./deep/a")',
        errors: ['Useless path segments for "./deep//a", should be "./deep/a"'],
        languageOptions: { parser: require(parsers.BABEL) },
      }),
    ],
  })
}

for (const resolver of ['node', 'webpack'] as const) {
  runResolverTests(resolver)
}
