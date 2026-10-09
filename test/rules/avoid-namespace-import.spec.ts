import { RuleTester } from '@typescript-eslint/rule-tester'

import { parsers, createRuleTestCaseFunctions, isESLint10 } from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
import rule from 'eslint-plugin-import-x/rules/avoid-namespace-import'

const ruleTester = new RuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('avoid-namespace-import', rule, {
  valid: [
    tValid({ code: 'import { foo } from "foo";' }),
    tValid({ code: 'import type { foo } from "foo";' }),
    tValid({ code: 'import type * as foo from "foo";' }),
    tValid({
      code: 'import * as foo from "foo";',
      options: [
        {
          allowList: ['foo'],
        },
      ],
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import * as foo from "foo";',
      errors: [{ messageId: 'avoidNamespace' }],
    }),
    tInvalid({
      code: 'import * as bar from "bar";',
      errors: [{ messageId: 'avoidNamespace' }],
      options: [
        {
          allowList: ['foo'],
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

  flowRuleTester.run('avoid-namespace-import', rule, {
    valid: [
      // `import typeof` is erased at runtime, like `import type`
      tValid({ code: 'import typeof * as foo from "foo";' }),
    ],
    invalid: [],
  })
})
