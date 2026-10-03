import { RuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/avoid-barrel-files'

const ruleTester = new RuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('avoid-barrel-files ts', rule, {
  valid: [
    tValid({
      code: `
        type Money = string;
        export type { Money };
      `,
    }),
    tValid({
      code: `
        type Money = {
          amount: string;
          currency: string;
        };
        export type { Money };
      `,
    }),
    tValid({
      code: `
        interface Money {
          amount: string;
          currency: string;
        };
        type Country = string;
        type State = {
          name: string;
        };
        const newSouthWales = {
          name: "New South Wales"
        };
        export { newSouthWales }
        export type { Money, Country, State };
      `,
    }),
  ],

  invalid: [
    tInvalid({
      code: `
        import { Country } from 'geo';
        type Money = string;
        type State = {
          name: string;
        };
        interface Person { name: string; age: number; }
        export type { Money, Country, Person, State };
      `,
      errors: [{ messageId: 'avoidBarrel' }],
    }),
  ],
})
