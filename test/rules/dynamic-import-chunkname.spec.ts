import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import { TSESTree } from '@typescript-eslint/utils'

import { SYNTAX_VALID_CASES, parsers } from '../utils'
import type { GetRuleModuleOptions } from '../utils'

import rule from 'eslint-plugin-import-x/rules/dynamic-import-chunkname'

const ruleTester = new TSESLintRuleTester()

type RuleOptions = GetRuleModuleOptions<typeof rule>

const pickyCommentFormat = '[a-zA-Z-_/.]+'

const options = [
  {
    importFunctions: ['dynamicImport'],
  },
] as const satisfies RuleOptions

const pickyCommentOptions = [
  {
    importFunctions: ['dynamicImport'],
    webpackChunknameFormat: pickyCommentFormat,
  },
] as const satisfies RuleOptions

const allowEmptyOptions = [
  {
    importFunctions: ['dynamicImport'],
    allowEmpty: true,
  },
] as const satisfies RuleOptions

const multipleImportFunctionOptions = [
  {
    importFunctions: ['dynamicImport', 'definitelyNotStaticImport'],
  },
] as const satisfies RuleOptions

const babelParser = require(parsers.BABEL)

const pickyChunkNameFormatError = {
  messageId: 'chunknameFormat',
  data: {
    format: `webpackChunkName: ["']${pickyCommentFormat}["'],?`,
  },
} as const

ruleTester.run('dynamic-import-chunkname', rule, {
  valid: [
    {
      code: `dynamicImport(
        /* webpackChunkName: "someModule" */
        'test'
      )`,
      options,
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: "Some_Other_Module" */
        "test"
      )`,
      options,
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: "SomeModule123" */
        "test"
      )`,
      options,
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: "someModule" */
        'someModule'
      )`,
      options: pickyCommentOptions,
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: "[request]" */
        'someModule'
      )`,
      options,
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: "my-chunk-[request]-custom" */
        'someModule'
      )`,
      options,
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: '[index]' */
        'someModule'
      )`,
      options,
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: 'my-chunk.[index].with-index' */
        'someModule'
      )`,
      options,
    },
    {
      code: `import('test')`,
      options: allowEmptyOptions,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackMode: "lazy" */
        'test'
      )`,
      options: allowEmptyOptions,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "Some_Other_Module" */
        "test"
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "SomeModule123" */
        "test"
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackPrefetch: true */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackPrefetch: true, */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackPrefetch: true, webpackChunkName: "someModule" */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackPrefetch: true, webpackChunkName: "someModule", */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackPrefetch: true */
        /* webpackChunkName: "someModule" */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPrefetch: true */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPrefetch: 12 */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPrefetch: -30 */
        'test'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: 'someModule' */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        'someModule'
      )`,
      options: pickyCommentOptions,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "[request]" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "my-chunk-[request]-custom" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: '[index]' */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: 'my-chunk.[index].with-index' */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackInclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackInclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackExclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackExclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPreload: true */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPreload: 0 */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPreload: -2 */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackPreload: false */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackIgnore: false */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackIgnore: true */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackMode: "lazy" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: 'someModule', webpackMode: 'lazy' */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackMode: "lazy-once" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackMode: "weak" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackExports: "default" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackExports: "named" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackExports: ["default", "named"] */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: 'someModule', webpackExports: ['default', 'named'] */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackInclude: /\\.json$/ */
        /* webpackExclude: /\\.json$/ */
        /* webpackPrefetch: true */
        /* webpackPreload: true */
        /* webpackIgnore: false */
        /* webpackMode: "lazy" */
        /* webpackExports: ["default", "named"] */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
    },
    ...SYNTAX_VALID_CASES,
  ],

  invalid: [
    {
      code: `import(
        // webpackChunkName: "someModule"
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'blockComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: "import('test')",
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'leadingComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: someModule */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: "someModule' */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: 'someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName:"someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: true */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'chunknameFormat',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: "my-module-[id]" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'chunknameFormat',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: ["request"] */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'chunknameFormat',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /*webpackChunkName: "someModule"*/
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'paddedSpaces',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName  :  "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" ; */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* totally not webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackPrefetch: true */
        /* webpackChunk: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackPrefetch: true, webpackChunk: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackChunkName: "someModule123" */
        'someModule'
      )`,
      options: pickyCommentOptions,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          ...pickyChunkNameFormatError,
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackPrefetch: "module", webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackPreload: "module", webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackIgnore: "no", webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackInclude: "someModule", webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackInclude: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackExclude: "someModule", webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackExclude: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackMode: "fast", webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackMode: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackExports: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `import(
        /* webpackExports: /default/, webpackChunkName: "someModule" */
        'someModule'
      )`,
      options,
      languageOptions: { parser: babelParser },
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.ImportExpression,
        },
      ],
    },
    {
      code: `dynamicImport(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
      options: multipleImportFunctionOptions,
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      code: `definitelyNotStaticImport(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
      options: multipleImportFunctionOptions,
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      code: `dynamicImport(
        // webpackChunkName: "someModule"
        'someModule'
      )`,
      options,
      output: null,
      errors: [
        {
          messageId: 'blockComment',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      code: "dynamicImport('test')",
      options,
      output: null,
      errors: [
        {
          messageId: 'leadingComment',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: someModule */
        'someModule'
      )`,
      options,
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      code: `dynamicImport(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
      options,
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      code: `dynamicImport(
        /* webpackChunkName:"someModule" */
        'someModule'
      )`,
      options,
      output: null,
      errors: [
        {
          messageId: 'webpackComment',
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
    {
      code: `dynamicImport(
        /* webpackChunkName: "someModule123" */
        'someModule'
      )`,
      options: pickyCommentOptions,
      output: null,
      errors: [
        {
          ...pickyChunkNameFormatError,
          type: TSESTree.AST_NODE_TYPES.CallExpression,
        },
      ],
    },
  ],
})

describe('TypeScript', () => {
  const nodeType = TSESTree.AST_NODE_TYPES.ImportExpression

  ruleTester.run('dynamic-import-chunkname', rule, {
    valid: [
      {
        code: `import('test')`,
        options: allowEmptyOptions,
      },
      {
        code: `import(
            /* webpackMode: "lazy" */
            'test'
          )`,
        options: allowEmptyOptions,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "Some_Other_Module" */
            "test"
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "SomeModule123" */
            "test"
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackPrefetch: true */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackPrefetch: true, */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackPrefetch: true, webpackChunkName: "someModule" */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackPrefetch: true, webpackChunkName: "someModule", */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackPrefetch: true */
            /* webpackChunkName: "someModule" */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPrefetch: true */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPrefetch: 11 */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPrefetch: -11 */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            'someModule'
          )`,
        options: pickyCommentOptions,
      },
      {
        code: `import(
            /* webpackChunkName: 'someModule' */
            'test'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "[request]" */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "my-chunk-[request]-custom" */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: '[index]' */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: 'my-chunk.[index].with-index' */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackInclude: /\\.json$/ */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackInclude: /\\.json$/ */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackExclude: /\\.json$/ */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackExclude: /\\.json$/ */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPreload: true */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackPreload: false */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackIgnore: false */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackIgnore: true */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackMode: "lazy" */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: 'someModule', webpackMode: 'lazy' */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackMode: "lazy-once" */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackMode: "weak" */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackExports: "default" */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackExports: "named" */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackExports: ["default", "named"] */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: 'someModule', webpackExports: ['default', 'named'] */
            'someModule'
          )`,
        options,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackInclude: /\\.json$/ */
            /* webpackExclude: /\\.json$/ */
            /* webpackPrefetch: true */
            /* webpackPreload: true */
            /* webpackIgnore: false */
            /* webpackMode: "lazy" */
            /* webpackExports: ["default", "named"] */
            'someModule'
          )`,
        options,
      },
    ],
    invalid: [
      {
        code: `import(
            // webpackChunkName: "someModule"
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'blockComment',
            type: nodeType,
          },
        ],
      },
      {
        code: "import('test')",
        options,

        output: null,
        errors: [
          {
            messageId: 'leadingComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName: someModule */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName "someModule' */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName 'someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName:"someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /*webpackChunkName: "someModule"*/
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'paddedSpaces',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName  :  "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" ; */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* totally not webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackPrefetch: true */
            /* webpackChunk: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackPrefetch: true, webpackChunk: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName: true */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'chunknameFormat',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName: "my-module-[id]" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'chunknameFormat',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName: ["request"] */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'chunknameFormat',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackChunkName: "someModule123" */
            'someModule'
          )`,
        options: pickyCommentOptions,

        output: null,
        errors: [
          {
            ...pickyChunkNameFormatError,
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackPrefetch: "module", webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackPreload: "module", webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackIgnore: "no", webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackInclude: "someModule", webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackInclude: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackExclude: "someModule", webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackExclude: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackMode: "fast", webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackMode: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackExports: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
            /* webpackExports: /default/, webpackChunkName: "someModule" */
            'someModule'
          )`,
        options,

        output: null,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
      {
        code: `import(
          /* webpackChunkName: "someModule" */
          /* webpackMode: "eager" */
          'someModule'
        )`,
        options,
        languageOptions: { parser: babelParser },
        output: null,
        errors: [
          {
            messageId: 'webpackEagerModeNoChunkName',
            type: nodeType,
            suggestions: [
              {
                messageId: 'webpackRemoveChunkName',
                output: `import(
          /* webpackMode: "eager" */
          'someModule'
        )`,
              },
              {
                messageId: 'webpackRemoveEagerMode',
                output: `import(
          /* webpackChunkName: "someModule" */
          'someModule'
        )`,
              },
            ],
          },
        ],
      },
      {
        code: `import(
          /* webpackChunkName: "someModule", webpackPrefetch: true */
          /* webpackMode: "eager" */
          'someModule'
        )`,
        options,
        languageOptions: { parser: babelParser },
        output: null,
        errors: [
          {
            messageId: 'webpackEagerModeNoChunkName',
            type: nodeType,
            suggestions: [
              {
                messageId: 'webpackRemoveChunkName',
                output: `import(
          /* webpackPrefetch: true */
          /* webpackMode: "eager" */
          'someModule'
        )`,
              },
              {
                messageId: 'webpackRemoveEagerMode',
                output: `import(
          /* webpackChunkName: "someModule", webpackPrefetch: true */
          'someModule'
        )`,
              },
            ],
          },
        ],
      },
      {
        code: `import(
          /* webpackChunkName: "someModule" */
          /* webpackMode: "eager", webpackPrefetch: true */
          'someModule'
        )`,
        options,
        languageOptions: { parser: babelParser },
        output: null,
        errors: [
          {
            messageId: 'webpackEagerModeNoChunkName',
            type: nodeType,
            suggestions: [
              {
                messageId: 'webpackRemoveChunkName',
                output: `import(
          /* webpackMode: "eager", webpackPrefetch: true */
          'someModule'
        )`,
              },
              {
                messageId: 'webpackRemoveEagerMode',
                output: `import(
          /* webpackChunkName: "someModule" */
          /* webpackPrefetch: true */
          'someModule'
        )`,
              },
            ],
          },
        ],
      },
    ],
  })
})
