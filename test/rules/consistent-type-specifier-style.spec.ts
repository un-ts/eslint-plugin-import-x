import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

import { parsers, createRuleTestCaseFunctions } from '../utils.js'
import type { RuleRunTests } from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/consistent-type-specifier-style'

const { tValid } = createRuleTestCaseFunctions<typeof rule>()

const COMMON_TESTS: RuleRunTests<typeof rule> = {
  valid: [
    //
    // prefer-top-level
    //
    tValid({
      code: "import Foo from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import type Foo from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import { Foo } from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import { Foo as Bar } from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import * as Foo from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import {} from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import type {} from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import type { Foo } from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import type { Foo as Bar } from 'Foo';",
      options: ['prefer-top-level'],
    }),
    tValid({
      code: "import type { Foo, Bar, Baz, Bam } from 'Foo';",
      options: ['prefer-top-level'],
    }),

    //
    // prefer-inline
    //
    tValid({
      code: "import Foo from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import type Foo from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import { Foo } from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import { Foo as Bar } from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import * as Foo from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import {} from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import type {} from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import { type Foo } from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import { type Foo as Bar } from 'Foo';",
      options: ['prefer-inline'],
    }),
    tValid({
      code: "import { type Foo, type Bar, Baz, Bam } from 'Foo';",
      options: ['prefer-inline'],
    }),
  ],
  invalid: [
    //
    // prefer-top-level
    //
    {
      code: "import { type Foo } from 'Foo';",
      output: "import type {Foo} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        {
          messageId: 'topLevel',
          data: {
            kind: 'type',
          },
          type: AST_NODE_TYPES.ImportDeclaration,
        },
      ],
    },
    {
      code: "import { type Foo as Bar } from 'Foo';",
      output: "import type {Foo as Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        { messageId: 'topLevel', type: AST_NODE_TYPES.ImportDeclaration },
      ],
    },
    {
      code: "import { type Foo, type Bar } from 'Foo';",
      output: "import type {Foo, Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        { messageId: 'topLevel', type: AST_NODE_TYPES.ImportDeclaration },
      ],
    },
    {
      code: "import { Foo, type Bar } from 'Foo';",
      output: "import { Foo  } from 'Foo';\nimport type {Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },
    {
      code: "import { type Foo, Bar } from 'Foo';",
      output: "import {  Bar } from 'Foo';\nimport type {Foo} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },
    {
      code: "import Foo, { type Bar } from 'Foo';",
      output: "import Foo from 'Foo';\nimport type {Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },
    {
      code: "import Foo, { type Bar, Baz } from 'Foo';",
      output: "import Foo, {  Baz } from 'Foo';\nimport type {Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },
    // https://github.com/import-js/eslint-plugin-import-x/issues/2753
    {
      code: `\
import { Component, type ComponentProps } from "package-1";
import {
  Component1,
  Component2,
  Component3,
  Component4,
  Component5,
} from "package-2";`,
      output: `\
import { Component  } from "package-1";
import type {ComponentProps} from "package-1";
import {
  Component1,
  Component2,
  Component3,
  Component4,
  Component5,
} from "package-2";`,
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },

    //
    // prefer-inline
    //
    {
      code: "import type { Foo } from 'Foo';",
      output: "import  { type Foo } from 'Foo';",
      options: ['prefer-inline'],
      errors: [
        {
          messageId: 'inline',
          data: {
            kind: 'type',
          },
          type: AST_NODE_TYPES.ImportDeclaration,
        },
      ],
    },
    {
      code: "import type { Foo, Bar, Baz } from 'Foo';",
      output: "import  { type Foo, type Bar, type Baz } from 'Foo';",
      options: ['prefer-inline'],
      errors: [{ messageId: 'inline', type: AST_NODE_TYPES.ImportDeclaration }],
    },
  ],
} as const

const TS_ONLY: RuleRunTests<typeof rule> = {
  valid: [
    //
    // always valid
    //
    tValid({ code: "import type * as Foo from 'Foo';" }),
  ],
  invalid: [],
}

const FLOW_ONLY: RuleRunTests<typeof rule> = {
  valid: [
    //
    // prefer-top-level
    //
    {
      code: "import typeof Foo from 'Foo';",
      options: ['prefer-top-level'],
    },
    {
      code: "import typeof { Foo, Bar, Baz, Bam } from 'Foo';",
      options: ['prefer-top-level'],
    },

    //
    // prefer-inline
    //
    {
      code: "import typeof Foo from 'Foo';",
      options: ['prefer-inline'],
    },
    {
      code: "import { typeof Foo } from 'Foo';",
      options: ['prefer-inline'],
    },
    {
      code: "import { typeof Foo, typeof Bar, typeof Baz, typeof Bam } from 'Foo';",
      options: ['prefer-inline'],
    },
    {
      code: "import { type Foo, type Bar, typeof Baz, typeof Bam } from 'Foo';",
      options: ['prefer-inline'],
    },
  ],
  invalid: [
    //
    // prefer-top-level
    //
    {
      code: "import { typeof Foo } from 'Foo';",
      output: "import typeof {Foo} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        {
          messageId: 'topLevel',
          data: {
            kind: 'typeof',
          },
          type: AST_NODE_TYPES.ImportDeclaration,
        },
      ],
    },
    {
      code: "import { typeof Foo as Bar } from 'Foo';",
      output: "import typeof {Foo as Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        { messageId: 'topLevel', type: AST_NODE_TYPES.ImportDeclaration },
      ],
    },
    {
      code: "import { type Foo, typeof Bar } from 'Foo';",
      output: "import type {Foo} from 'Foo';\nimport typeof {Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        {
          messageId: 'topLevel',
          data: {
            kind: 'type/typeof',
          },
          type: AST_NODE_TYPES.ImportDeclaration,
        },
      ],
    },
    {
      code: "import { typeof Foo, typeof Bar } from 'Foo';",
      output: "import typeof {Foo, Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        { messageId: 'topLevel', type: AST_NODE_TYPES.ImportDeclaration },
      ],
    },
    {
      code: "import { Foo, typeof Bar } from 'Foo';",
      output: "import { Foo  } from 'Foo';\nimport typeof {Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },
    {
      code: "import { typeof Foo, Bar } from 'Foo';",
      output: "import {  Bar } from 'Foo';\nimport typeof {Foo} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },
    {
      code: "import { Foo, type Bar, typeof Baz } from 'Foo';",
      output:
        "import { Foo   } from 'Foo';\nimport type {Bar} from 'Foo';\nimport typeof {Baz} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [
        {
          messageId: 'topLevel',
          data: {
            kind: 'type',
          },
          type: AST_NODE_TYPES.ImportSpecifier,
        },
        {
          messageId: 'topLevel',
          data: {
            kind: 'typeof',
          },
          type: AST_NODE_TYPES.ImportSpecifier,
        },
      ],
    },
    {
      code: "import Foo, { typeof Bar } from 'Foo';",
      output: "import Foo from 'Foo';\nimport typeof {Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },
    {
      code: "import Foo, { typeof Bar, Baz } from 'Foo';",
      output:
        "import Foo, {  Baz } from 'Foo';\nimport typeof {Bar} from 'Foo';",
      options: ['prefer-top-level'],
      errors: [{ messageId: 'topLevel', type: AST_NODE_TYPES.ImportSpecifier }],
    },

    //
    // prefer-inline
    //
    {
      code: "import typeof { Foo } from 'Foo';",
      output: "import  { typeof Foo } from 'Foo';",
      options: ['prefer-inline'],
      errors: [
        {
          messageId: 'inline',
          data: {
            kind: 'typeof',
          },
          type: AST_NODE_TYPES.ImportDeclaration,
        },
      ],
    },
    {
      code: "import typeof { Foo, Bar, Baz } from 'Foo';",
      output: "import  { typeof Foo, typeof Bar, typeof Baz } from 'Foo';",
      options: ['prefer-inline'],
      errors: [{ messageId: 'inline', type: AST_NODE_TYPES.ImportDeclaration }],
    },
  ],
} as const

describe('TypeScript', () => {
  const ruleTester = new TSESLintRuleTester({
    languageOptions: {
      parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
      },
    },
  })
  ruleTester.run('consistent-type-specifier-style', rule, {
    valid: [...COMMON_TESTS.valid, ...TS_ONLY.valid],
    invalid: [...COMMON_TESTS.invalid, ...TS_ONLY.invalid],
  })
})

describe('Babel/Flow', () => {
  const ruleTester = new TSESLintRuleTester({
    languageOptions: {
      parser: cjsRequire(parsers.BABEL),
      parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
        requireConfigFile: false,
        babelOptions: {
          configFile: false,
          babelrc: false,
          presets: ['@babel/flow'],
        },
      },
    },
  })
  ruleTester.run('consistent-type-specifier-style', rule, {
    valid: [...COMMON_TESTS.valid, ...FLOW_ONLY.valid],
    invalid: [...COMMON_TESTS.invalid, ...FLOW_ONLY.invalid],
  })
})

describe('Hermes/Flow', () => {
  const ruleTester = new TSESLintRuleTester({
    languageOptions: {
      parser: cjsRequire(parsers.HERMES),
      parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
      },
    },
  })
  ruleTester.run('consistent-type-specifier-style', rule, {
    valid: [...COMMON_TESTS.valid, ...FLOW_ONLY.valid],
    invalid: [...COMMON_TESTS.invalid, ...FLOW_ONLY.invalid],
  })
})
