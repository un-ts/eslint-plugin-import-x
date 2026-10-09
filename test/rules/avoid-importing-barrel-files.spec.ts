import { RuleTester } from '@typescript-eslint/rule-tester'

import {
  parsers,
  createRuleTestCaseFunctions,
  isESLint10,
  testFilePath,
} from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/avoid-importing-barrel-files'

const ruleTester = new RuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

/** Imports resolve relative to this file's directory. */
const filename = testFilePath('barrel-files/consumer.js')

ruleTester.run('avoid-importing-barrel-files', rule, {
  valid: [
    // declares everything it exports — not a barrel file
    tValid({
      code: "import { a } from './not-barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 0 }],
    }),
    // a barrel file, but its module graph is within the default limit
    tValid({
      code: "import { a } from './barrel.js';",
      filename,
    }),
    // importing a barrel is allowed when the specifier is allow-listed
    tValid({
      code: "import { a } from './barrel.js';",
      filename,
      options: [{ allowList: ['./barrel.js'], maxModuleGraphSizeAllowed: 0 }],
    }),
    // type-only imports are erased and never load the module graph
    tValid({
      code: "import type { A } from './barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 0 }],
    }),
    // inline type specifiers are erased as well
    tValid({
      code: "import { type A } from './barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 0 }],
    }),
    // a leading default specifier keeps a mixed import at runtime
    tValid({
      code: "import Foo, { type A } from './barrel.js';",
      filename,
    }),
    // the export threshold is above what the module exports
    tValid({
      code: "import { a } from './barrel.js';",
      filename,
      options: [
        {
          amountOfExportsToConsiderModuleAsBarrel: 10,
          maxModuleGraphSizeAllowed: 0,
        },
      ],
    }),
    // unresolved specifiers are not this rule's concern
    tValid({
      code: "import { a } from './does-not-exist.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 0 }],
    }),
    // a dependency reached twice is only visited once
    tValid({
      code: "import { a } from './dup-barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 10 }],
    }),
    // a graph exactly at the limit is allowed
    tValid({
      code: "import { a } from './barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 6 }],
    }),
  ],

  invalid: [
    tInvalid({
      code: "import { a } from './barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 5 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 6,
            specifier: './barrel.js',
            maxModuleGraphSizeAllowed: 5,
          },
        },
      ],
    }),
    tInvalid({
      code: "import { a } from './star-barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 5 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 6,
            specifier: './star-barrel.js',
            maxModuleGraphSizeAllowed: 5,
          },
        },
      ],
    }),
    // names imported and re-exported still make a barrel file
    tInvalid({
      code: "import { a } from './passthrough-barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 5 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 6,
            specifier: './passthrough-barrel.js',
            maxModuleGraphSizeAllowed: 5,
          },
        },
      ],
    }),
    // a dependency reached through two paths is only counted once
    tInvalid({
      code: "import { a } from './dup-barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 5 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 6,
            specifier: './dup-barrel.js',
            maxModuleGraphSizeAllowed: 5,
          },
        },
      ],
    }),
    // type-only edges are skipped when sizing the graph
    tInvalid({
      code: "import { a } from './type-barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 5 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 6,
            specifier: './type-barrel.js',
            maxModuleGraphSizeAllowed: 5,
          },
        },
      ],
    }),
    // the walk stops once the limit is exceeded, so `amount` is a lower bound
    tInvalid({
      code: "import { a } from './barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 2 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 3,
            specifier: './barrel.js',
            maxModuleGraphSizeAllowed: 2,
          },
        },
      ],
    }),
    // side-effect-only imports load the graph too
    tInvalid({
      code: "import './barrel.js';",
      filename,
      options: [{ maxModuleGraphSizeAllowed: 5 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 6,
            specifier: './barrel.js',
            maxModuleGraphSizeAllowed: 5,
          },
        },
      ],
    }),
  ],
})

// TODO: babel 8 appears to remove import typeof support
;(isESLint10 ? describe.skip : describe)('Flow', () => {
  const flowRuleTester = new RuleTester({
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

  flowRuleTester.run('avoid-importing-barrel-files', rule, {
    valid: [
      // `import typeof` is erased at runtime, like `import type`
      tValid({
        code: "import typeof { a } from './barrel.js';",
        filename,
        options: [{ maxModuleGraphSizeAllowed: 0 }],
      }),
    ],
    invalid: [],
  })
})
