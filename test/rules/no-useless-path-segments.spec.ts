import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, createRuleTestCaseFunctions } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-useless-path-segments'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function runResolverTests(resolver: 'node' | 'webpack') {
  ruleTester.run(`no-useless-path-segments (${resolver})`, rule, {
    valid: [
      // CommonJS modules with default options
      tValid({
        code: 'require("./../fixtures/malformed.js")',
        languageOptions: { parser: require(parsers.ESPREE) },
      }),

      // ES modules with default options
      tValid({
        code: 'import "./malformed.js"',
        languageOptions: { parser: require(parsers.ESPREE) },
      }),
      tValid({ code: 'import "./test-module"' }),
      tValid({ code: 'import "./bar/"' }),
      tValid({ code: 'import "."' }),
      tValid({ code: 'import ".."' }),
      tValid({ code: 'import fs from "fs"' }),

      // ES modules + noUselessIndex
      tValid({ code: 'import "../index"' }), // noUselessIndex is false by default
      tValid({
        code: 'import "../my-custom-index"',
        options: [{ noUselessIndex: true }],
      }),
      tValid({
        code: 'import "./bar.js"',
        options: [{ noUselessIndex: true }],
      }), // ./bar/index.js exists
      tValid({ code: 'import "./bar"', options: [{ noUselessIndex: true }] }),
      tValid({ code: 'import "./bar/"', options: [{ noUselessIndex: true }] }), // ./bar.js exists
      tValid({
        code: 'import "./malformed.js"',
        languageOptions: { parser: require(parsers.BABEL) },
        options: [{ noUselessIndex: true }],
      }), // ./malformed directory does not exist
      tValid({
        code: 'import "./malformed"',
        options: [{ noUselessIndex: true }],
      }), // ./malformed directory does not exist
      tValid({
        code: 'import "./importType"',
        options: [{ noUselessIndex: true }],
      }), // ./importType.js does not exist

      tValid({
        code: 'import(".")',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tValid({
        code: 'import("..")',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tValid({
        code: 'import("fs").then(function(fs) {})',
        languageOptions: { parser: require(parsers.BABEL) },
      }),
    ],

    invalid: [
      // CommonJS modules
      tInvalid({
        code: 'require("./../fixtures/malformed.js")',
        output: [
          'require("../fixtures/malformed.js")',
          'require("./malformed.js")',
        ],
        options: [{ commonjs: true }],
        languageOptions: { parser: require(parsers.ESPREE) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './../fixtures/malformed.js',
              proposedPath: '../fixtures/malformed.js',
            },
          },
        ],
      }),
      tInvalid({
        code: 'require("./../fixtures/malformed")',
        output: ['require("../fixtures/malformed")', 'require("./malformed")'],
        options: [{ commonjs: true }],
        languageOptions: { parser: require(parsers.ESPREE) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './../fixtures/malformed',
              proposedPath: '../fixtures/malformed',
            },
          },
        ],
      }),
      tInvalid({
        code: 'require("../fixtures/malformed.js")',
        output: 'require("./malformed.js")',
        options: [{ commonjs: true }],
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: '../fixtures/malformed.js',
              proposedPath: './malformed.js',
            },
          },
        ],
      }),
      tInvalid({
        code: 'require("../fixtures/malformed")',
        output: 'require("./malformed")',
        options: [{ commonjs: true }],
        languageOptions: { parser: require(parsers.ESPREE) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: '../fixtures/malformed',
              proposedPath: './malformed',
            },
          },
        ],
      }),
      tInvalid({
        code: 'require("./test-module/")',
        output: 'require("./test-module")',
        options: [{ commonjs: true }],
        languageOptions: { parser: require(parsers.ESPREE) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './test-module/',
              proposedPath: './test-module',
            },
          },
        ],
      }),
      tInvalid({
        code: 'require("./")',
        output: 'require(".")',
        options: [{ commonjs: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './', proposedPath: '.' },
          },
        ],
      }),
      tInvalid({
        code: 'require("../")',
        output: 'require("..")',
        options: [{ commonjs: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: '../', proposedPath: '..' },
          },
        ],
      }),
      tInvalid({
        code: 'require("./deep//a")',
        output: 'require("./deep/a")',
        options: [{ commonjs: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './deep//a', proposedPath: './deep/a' },
          },
        ],
      }),

      // CommonJS modules + noUselessIndex
      tInvalid({
        code: 'require("./bar/index.js")',
        output: 'require("./bar/")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './bar/index.js', proposedPath: './bar/' },
          },
        ], // ./bar.js exists
      }),
      tInvalid({
        code: 'require("./bar/index")',
        output: 'require("./bar/")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './bar/index', proposedPath: './bar/' },
          },
        ], // ./bar.js exists
      }),
      tInvalid({
        code: 'require("./importPath/")',
        output: 'require("./importPath")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './importPath/', proposedPath: './importPath' },
          },
        ], // ./importPath.js does not exist
      }),
      tInvalid({
        code: 'require("./importPath/index.js")',
        output: 'require("./importPath")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './importPath/index.js',
              proposedPath: './importPath',
            },
          },
        ], // ./importPath.js does not exist
      }),
      tInvalid({
        code: 'require("./importType/index")',
        output: 'require("./importType")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './importType/index',
              proposedPath: './importType',
            },
          },
        ], // ./importPath.js does not exist
      }),
      tInvalid({
        code: 'require("./index")',
        output: 'require(".")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './index', proposedPath: '.' },
          },
        ],
      }),
      tInvalid({
        code: 'require("../index")',
        output: 'require("..")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: '../index', proposedPath: '..' },
          },
        ],
      }),
      tInvalid({
        code: 'require("../index.js")',
        output: 'require("..")',
        options: [{ commonjs: true, noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: '../index.js', proposedPath: '..' },
          },
        ],
      }),

      // ES modules
      tInvalid({
        code: 'import "./../fixtures/malformed.js"',
        output: [
          'import "../fixtures/malformed.js"',
          'import "./malformed.js"',
        ],
        languageOptions: { parser: require(parsers.ESPREE) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './../fixtures/malformed.js',
              proposedPath: '../fixtures/malformed.js',
            },
          },
        ],
      }),
      tInvalid({
        code: 'import "./../fixtures/malformed"',
        output: ['import "../fixtures/malformed"', 'import "./malformed"'],
        languageOptions: { parser: require(parsers.ESPREE) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './../fixtures/malformed',
              proposedPath: '../fixtures/malformed',
            },
          },
        ],
      }),
      tInvalid({
        code: 'import "../fixtures/malformed.js"',
        output: 'import "./malformed.js"',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: '../fixtures/malformed.js',
              proposedPath: './malformed.js',
            },
          },
        ],
      }),
      tInvalid({
        code: 'import "../fixtures/malformed"',
        output: 'import "./malformed"',
        languageOptions: { parser: require(parsers.ESPREE) },
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: '../fixtures/malformed',
              proposedPath: './malformed',
            },
          },
        ],
      }),
      tInvalid({
        code: 'import "./test-module/"',
        output: 'import "./test-module"',
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './test-module/',
              proposedPath: './test-module',
            },
          },
        ],
      }),
      tInvalid({
        code: 'import "./"',
        output: 'import "."',
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './', proposedPath: '.' },
          },
        ],
      }),
      tInvalid({
        code: 'import "../"',
        output: 'import ".."',
        errors: [
          {
            messageId: 'useless',
            data: { importPath: '../', proposedPath: '..' },
          },
        ],
      }),
      tInvalid({
        code: 'import "./deep//a"',
        output: 'import "./deep/a"',
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './deep//a', proposedPath: './deep/a' },
          },
        ],
      }),

      // ES modules + noUselessIndex
      tInvalid({
        code: 'import "./bar/index.js"',
        output: 'import "./bar/"',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './bar/index.js', proposedPath: './bar/' },
          },
        ], // ./bar.js exists
      }),
      tInvalid({
        code: 'import "./bar/index"',
        output: 'import "./bar/"',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './bar/index', proposedPath: './bar/' },
          },
        ], // ./bar.js exists
      }),
      tInvalid({
        code: 'import "./importPath/"',
        output: 'import "./importPath"',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './importPath/', proposedPath: './importPath' },
          },
        ], // ./importPath.js does not exist
      }),
      tInvalid({
        code: 'import "./importPath/index.js"',
        output: 'import "./importPath"',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './importPath/index.js',
              proposedPath: './importPath',
            },
          },
        ], // ./importPath.js does not exist
      }),
      tInvalid({
        code: 'import "./importPath/index"',
        output: 'import "./importPath"',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: {
              importPath: './importPath/index',
              proposedPath: './importPath',
            },
          },
        ], // ./importPath.js does not exist
      }),
      tInvalid({
        code: 'import "./index"',
        output: 'import "."',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './index', proposedPath: '.' },
          },
        ],
      }),
      tInvalid({
        code: 'import "../index"',
        output: 'import ".."',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: '../index', proposedPath: '..' },
          },
        ],
      }),
      tInvalid({
        code: 'import "../index.js"',
        output: 'import ".."',
        options: [{ noUselessIndex: true }],
        errors: [
          {
            messageId: 'useless',
            data: { importPath: '../index.js', proposedPath: '..' },
          },
        ],
      }),
      tInvalid({
        code: 'import("./")',
        output: 'import(".")',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './', proposedPath: '.' },
          },
        ],
      }),
      tInvalid({
        code: 'import("../")',
        output: 'import("..")',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            messageId: 'useless',
            data: { importPath: '../', proposedPath: '..' },
          },
        ],
      }),
      tInvalid({
        code: 'import("./deep//a")',
        output: 'import("./deep/a")',
        languageOptions: { parser: require(parsers.BABEL) },
        errors: [
          {
            messageId: 'useless',
            data: { importPath: './deep//a', proposedPath: './deep/a' },
          },
        ],
      }),
    ],
  })
}

for (const resolver of ['node', 'webpack'] as const) {
  runResolverTests(resolver)
}
