import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-namespace'

const ruleTester = new TSESLintRuleTester()

const { tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const NO_NAMESPACE_ERROR = { messageId: 'noNamespace' } as const

ruleTester.run('no-namespace', rule, {
  valid: [
    {
      code: "import { a, b } from 'foo';",
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: "import { a, b } from './foo';",
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: "import bar from 'bar';",
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: "import bar from './bar';",
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    },
    {
      code: "import * as bar from './ignored-module.ext';",
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
      options: [{ ignore: ['*.ext'] }],
    },
  ],

  invalid: [
    tInvalid({
      code: "import * as foo from 'foo';",
      errors: [
        {
          ...NO_NAMESPACE_ERROR,
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: "import defaultExport, * as foo from 'foo';",
      errors: [
        {
          ...NO_NAMESPACE_ERROR,
          line: 1,
          column: 23,
        },
      ],
    }),
    tInvalid({
      code: "import * as foo from './foo';",
      errors: [
        {
          ...NO_NAMESPACE_ERROR,
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: `
        import * as foo from './foo';
        florp(foo.bar);
        florp(foo['baz']);
      `.trim(),
      output: `
        import { bar, baz } from './foo';
        florp(bar);
        florp(baz);
      `.trim(),
      errors: [
        {
          ...NO_NAMESPACE_ERROR,
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: `
        import * as foo from './foo';
        const bar = 'name conflict';
        const baz = 'name conflict';
        const foo_baz = 'name conflict';
        florp(foo.bar);
        florp(foo['baz']);
      `.trim(),
      output: `
        import { bar as foo_bar, baz as foo_baz_1 } from './foo';
        const bar = 'name conflict';
        const baz = 'name conflict';
        const foo_baz = 'name conflict';
        florp(foo_bar);
        florp(foo_baz_1);
      `.trim(),
      errors: [
        {
          ...NO_NAMESPACE_ERROR,
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: `
        import * as foo from './foo';
        function func(arg) {
          florp(foo.func);
          florp(foo['arg']);
        }
      `.trim(),
      output: `
        import { func as foo_func, arg as foo_arg } from './foo';
        function func(arg) {
          florp(foo_func);
          florp(foo_arg);
        }
      `.trim(),
      errors: [
        {
          ...NO_NAMESPACE_ERROR,
          line: 1,
          column: 8,
        },
      ],
    }),
  ],
})
