import { RuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/avoid-barrel-files'

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const ruleTester = new RuleTester()

ruleTester.run('avoid-barrel-files', rule, {
  valid: [
    tValid({
      code: `
        let foo;
        export { foo };
      `,
    }),
    tValid({
      code: `
        let foo, bar;
        export { foo, bar };
      `,
    }),
    tValid({
      code: `
        let foo, bar, baz;
        export { foo, bar, baz };
      `,
    }),
    tValid({
      code: `
        let foo, bar, baz, qux;
        export { foo, bar, baz, qux };
      `,
    }),
    tValid({
      code: `
        let foo, bar, baz, qux, quux;
        export { foo, bar, baz, qux };
      `,
    }),
    tValid({
      code: `
        export default function Foo() {
          return 'bar';
        }
      `,
      options: [
        {
          amountOfExportsToConsiderModuleAsBarrel: 0,
        },
      ],
    }),
    tValid({
      code: `
        export default function bar() {}
      `,
      options: [
        {
          amountOfExportsToConsiderModuleAsBarrel: 0,
        },
      ],
    }),
    tValid({
      code: `
        export default defineFoo({});
      `,
      options: [
        {
          amountOfExportsToConsiderModuleAsBarrel: 0,
        },
      ],
    }),
  ],

  invalid: [
    tInvalid({
      code: `
        import { bar, baz, qux} from 'foo';
        let foo;
        export { foo, bar, baz, qux,  };
      `,
      errors: [{ messageId: 'avoidBarrel' }],
    }),
    tInvalid({
      code: `
        export * from 'foo';
        export * from 'bar';
        export * from 'baz';
        export * from 'qux';
      `,
      errors: [{ messageId: 'avoidBarrel' }],
    }),
    tInvalid({
      code: `export { foo, bar, baz } from 'foo';`,
      errors: [{ messageId: 'avoidBarrel' }],
      options: [
        {
          amountOfExportsToConsiderModuleAsBarrel: 2,
        },
      ],
    }),
    tInvalid({
      code: 'export default { var1, var2, var3, var4 };',
      errors: [{ messageId: 'avoidBarrel' }],
    }),
  ],
})
