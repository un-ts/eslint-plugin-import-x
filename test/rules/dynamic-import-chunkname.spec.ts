import { TSESLint, TSESTree } from '@typescript-eslint/utils'

import rule from '../../src/rules/dynamic-import-chunkname'

import { SYNTAX_CASES, parsers } from '../utils'

const ruleTester = new TSESLint.RuleTester()

const pickyCommentFormat = '[a-zA-Z-_/.]+'

const options = [
  {
    importFunctions: ['dynamicImport'],
  },
] as const

const pickyCommentOptions = [
  {
    importFunctions: ['dynamicImport'],
    webpackChunknameFormat: pickyCommentFormat,
  },
] as const

const allowEmptyOptions = [
  {
    importFunctions: ['dynamicImport'],
    allowEmpty: true,
  },
] as const

const multipleImportFunctionOptions = [
  {
    importFunctions: ['dynamicImport', 'definitelyNotStaticImport'],
  },
] as const

const parser = parsers.BABEL

const pickyChunkNameFormatError = {
  messageId: 'chunknameFormat',
  data: {
    format: ` webpackChunkName: ["']${pickyCommentFormat}["'],? `,
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
      parser,
    },
    {
      code: `import(
        /* webpackMode: "lazy" */
        'test'
      )`,
      options: allowEmptyOptions,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "Some_Other_Module" */
        "test"
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "SomeModule123" */
        "test"
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackPrefetch: true */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackPrefetch: true, */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackPrefetch: true, webpackChunkName: "someModule" */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackPrefetch: true, webpackChunkName: "someModule", */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackPrefetch: true */
        /* webpackChunkName: "someModule" */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPrefetch: true */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPrefetch: 12 */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPrefetch: -30 */
        'test'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: 'someModule' */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        'someModule'
      )`,
      options: pickyCommentOptions,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "[request]" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "my-chunk-[request]-custom" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: '[index]' */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: 'my-chunk.[index].with-index' */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackInclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackInclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackExclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackExclude: /\\.json$/ */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPreload: true */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPreload: 0 */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackPreload: -2 */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackPreload: false */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackIgnore: false */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackIgnore: true */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackMode: "lazy" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: 'someModule', webpackMode: 'lazy' */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackMode: "lazy-once" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackMode: "eager" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackMode: "weak" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackExports: "default" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule", webpackExports: "named" */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackExports: ["default", "named"] */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: 'someModule', webpackExports: ['default', 'named'] */
        'someModule'
      )`,
      options,
      parser,
    },
    {
      code: `import(
        /* webpackChunkName: "someModule" */
        /* webpackInclude: /\\.json$/ */
        /* webpackExclude: /\\.json$/ */
        /* webpackPrefetch: true */
        /* webpackPreload: true */
        /* webpackIgnore: false */
        /* webpackMode: "eager" */
        /* webpackExports: ["default", "named"] */
        'someModule'
      )`,
      options,
      parser,
    },
    ...SYNTAX_CASES,
  ],

  invalid: [
    {
      code: `import(
        // webpackChunkName: "someModule"
        'someModule'
      )`,
      options,
      parser,
      output: `import(
        // webpackChunkName: "someModule"
        'someModule'
      )`,
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
      parser,
      output: "import('test')",
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
      parser,
      output: `import(
        /* webpackChunkName: someModule */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName: "someModule' */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName: 'someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName:"someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName: true */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName: "my-module-[id]" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName: ["request"] */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /*webpackChunkName: "someModule"*/
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName  :  "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName: "someModule" ; */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* totally not webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackPrefetch: true */
        /* webpackChunk: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackPrefetch: true, webpackChunk: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackChunkName: "someModule123" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackPrefetch: "module", webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackPreload: "module", webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackIgnore: "no", webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackInclude: "someModule", webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackInclude: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackExclude: "someModule", webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackExclude: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackMode: "fast", webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackMode: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackExports: true, webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      parser,
      output: `import(
        /* webpackExports: /default/, webpackChunkName: "someModule" */
        'someModule'
      )`,
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
      output: `dynamicImport(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
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
      output: `definitelyNotStaticImport(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
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
      output: `dynamicImport(
        // webpackChunkName: "someModule"
        'someModule'
      )`,
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
      output: "dynamicImport('test')",
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
      output: `dynamicImport(
        /* webpackChunkName: someModule */
        'someModule'
      )`,
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
      output: `dynamicImport(
        /* webpackChunkName "someModule" */
        'someModule'
      )`,
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
      output: `dynamicImport(
        /* webpackChunkName:"someModule" */
        'someModule'
      )`,
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
      output: `dynamicImport(
        /* webpackChunkName: "someModule123" */
        'someModule'
      )`,
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
  const typescriptParser = parsers.TS
  const nodeType = TSESTree.AST_NODE_TYPES.ImportExpression

  ruleTester.run('dynamic-import-chunkname', rule, {
    valid: [
      {
        code: `import('test')`,
        options: allowEmptyOptions,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackMode: "lazy" */
            'test'
          )`,
        options: allowEmptyOptions,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "Some_Other_Module" */
            "test"
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "SomeModule123" */
            "test"
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackPrefetch: true */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackPrefetch: true, */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackPrefetch: true, webpackChunkName: "someModule" */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackPrefetch: true, webpackChunkName: "someModule", */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackPrefetch: true */
            /* webpackChunkName: "someModule" */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPrefetch: true */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPrefetch: 11 */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPrefetch: -11 */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            'someModule'
          )`,
        options: pickyCommentOptions,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: 'someModule' */
            'test'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "[request]" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "my-chunk-[request]-custom" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: '[index]' */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: 'my-chunk.[index].with-index' */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackInclude: /\\.json$/ */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackInclude: /\\.json$/ */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackExclude: /\\.json$/ */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackExclude: /\\.json$/ */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackPreload: true */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackPreload: false */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackIgnore: false */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackIgnore: true */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackMode: "lazy" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: 'someModule', webpackMode: 'lazy' */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackMode: "lazy-once" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackMode: "eager" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackMode: "weak" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackExports: "default" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule", webpackExports: "named" */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackExports: ["default", "named"] */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: 'someModule', webpackExports: ['default', 'named'] */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
      {
        code: `import(
            /* webpackChunkName: "someModule" */
            /* webpackInclude: /\\.json$/ */
            /* webpackExclude: /\\.json$/ */
            /* webpackPrefetch: true */
            /* webpackPreload: true */
            /* webpackIgnore: false */
            /* webpackMode: "eager" */
            /* webpackExports: ["default", "named"] */
            'someModule'
          )`,
        options,
        parser: typescriptParser,
      },
    ],
    invalid: [
      {
        code: `import(
            // webpackChunkName: "someModule"
            'someModule'
          )`,
        options,
        parser: typescriptParser,
        output: `import(
            // webpackChunkName: "someModule"
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: "import('test')",
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName: someModule */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName "someModule' */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName 'someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName:"someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /*webpackChunkName: "someModule"*/
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName  :  "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName: "someModule" ; */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* totally not webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackPrefetch: true */
            /* webpackChunk: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackPrefetch: true, webpackChunk: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName: true */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName: "my-module-[id]" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName: ["request"] */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackChunkName: "someModule123" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackPrefetch: "module", webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackPreload: "module", webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackIgnore: "no", webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackInclude: "someModule", webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackInclude: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackExclude: "someModule", webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackExclude: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackMode: "fast", webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackMode: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackExports: true, webpackChunkName: "someModule" */
            'someModule'
          )`,
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
        parser: typescriptParser,
        output: `import(
            /* webpackExports: /default/, webpackChunkName: "someModule" */
            'someModule'
          )`,
        errors: [
          {
            messageId: 'webpackComment',
            type: nodeType,
          },
        ],
      },
    ],
  })
})
