import { RuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils.js'

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
      options: [{ maxModuleGraphSizeAllowed: 0 }],
      errors: [
        {
          messageId: 'avoidImport',
          data: {
            amount: 6,
            specifier: './star-barrel.js',
            maxModuleGraphSizeAllowed: 0,
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
  ],
})
