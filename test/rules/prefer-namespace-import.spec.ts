import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  getNonDefaultParsers,
  parsers,
  testFilePath,
} from '../utils.js'

import { cjsRequire as require } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/prefer-namespace-import'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const options = [{ patterns: ['/^@scope/', '/^prefix-/', 'specific'] }] as const

ruleTester.run('prefer-namespace-import', rule, {
  valid: [
    tValid({
      code: `import * as Name from '@scope/name';`,
    }),
    tValid({
      code: `import * as Name from 'prefix-name';`,
    }),
    tValid({
      code: `import * as Name from 'specific';`,
    }),
    tValid({
      code: `
          import * as Name1 from '@scope/name';
          import * as Name2 from 'prefix-name';
          import * as Name2 from 'specific';
          `,
    }),
    tValid({
      code: `import Name from 'other-name';`,
      options,
    }),
  ],
  invalid: [
    tInvalid({
      code: `
import Name1 from '@scope/name';
import Name2 from 'prefix-name';
import Name3 from 'prefix-name' with { type: 'json' };
import Name4, { name4 } from 'prefix-name' with { type: 'json' };
import Name5 from 'specific';
import Name6 from 'other-name';
          `,
      errors: [
        {
          messageId: 'preferNamespaceImport',
          data: { source: '@scope/name', specifier: 'Name1' },
        },
        {
          messageId: 'preferNamespaceImport',
          data: { source: 'prefix-name', specifier: 'Name2' },
        },
        {
          messageId: 'preferNamespaceImport',
          data: { source: 'prefix-name', specifier: 'Name3' },
        },
        {
          messageId: 'preferNamespaceImport',
          data: { source: 'prefix-name', specifier: 'Name4' },
        },
        {
          messageId: 'preferNamespaceImport',
          data: { source: 'specific', specifier: 'Name5' },
        },
      ],
      options,
      output: `
import * as Name1 from '@scope/name';
import * as Name2 from 'prefix-name';
import * as Name3 from 'prefix-name' with { type: 'json' };
import * as Name4 from 'prefix-name' with { type: 'json' };
import { name4 } from 'prefix-name' with { type: 'json' };
import * as Name5 from 'specific';
import Name6 from 'other-name';
          `,
    }),
  ],
})

describe('TypeScript', () => {
  for (const parser of getNonDefaultParsers()) {
    const parserConfig = {
      languageOptions: {
        ...(parser === parsers.BABEL && {
          parser: require<TSESLint.Parser.LooseParserModule>(parsers.BABEL),
        }),
      },
      filename: testFilePath('foo.ts'),
    }

    ruleTester.run('prefer-namespace-import', rule, {
      valid: [
        tValid({
          code: `
          import type * as Name1 from '@scope/name';
          import type * as Name2 from 'prefix-name';
          `,
          ...parserConfig,
        }),
        tValid({
          code: `import type Name from 'other-name';`,
          options,
          ...parserConfig,
        }),
      ],
      invalid: [
        tInvalid({
          code: `
import type Name1 from '@scope/name';
import type Name2 from 'prefix-name';
import type Name3 from 'prefix-name' with { type: 'json' };
import Name4, { type name4 } from 'prefix-name' with { type: 'json' };
import type Name5 from 'specific';
import type Name6 from 'other-name';
          `,
          errors: [
            {
              messageId: 'preferNamespaceImport',
              data: { source: '@scope/name', specifier: 'Name1' },
            },
            {
              messageId: 'preferNamespaceImport',
              data: { source: 'prefix-name', specifier: 'Name2' },
            },
            {
              messageId: 'preferNamespaceImport',
              data: { source: 'prefix-name', specifier: 'Name3' },
            },
            {
              messageId: 'preferNamespaceImport',
              data: { source: 'prefix-name', specifier: 'Name4' },
            },
            {
              messageId: 'preferNamespaceImport',
              data: { source: 'specific', specifier: 'Name5' },
            },
          ],
          options,
          output: `
import type * as Name1 from '@scope/name';
import type * as Name2 from 'prefix-name';
import type * as Name3 from 'prefix-name' with { type: 'json' };
import * as Name4 from 'prefix-name' with { type: 'json' };
import { type name4 } from 'prefix-name' with { type: 'json' };
import type * as Name5 from 'specific';
import type Name6 from 'other-name';
          `,
          ...parserConfig,
        }),
      ],
    })
  }
})
