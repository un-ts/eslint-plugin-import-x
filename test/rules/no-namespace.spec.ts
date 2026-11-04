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
      // exports named like `Object.prototype` members, e.g. `_.toString` from lodash
      code: `
        import * as foo from './foo';
        florp(foo.toString(), foo.valueOf());
      `.trim(),
      output: `
        import { toString as foo_toString, valueOf as foo_valueOf } from './foo';
        florp(foo_toString(), foo_valueOf());
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
        function bar() {
          return foo.__proto__;
        }
      `.trim(),
      output: `
        import { __proto__ } from './foo';
        function bar() {
          return __proto__;
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
    tInvalid({
      // no names in the two nearest scopes, this used to write `[object Object]` instead of throwing
      code: `
        import * as foo from './foo';
        if (a) {
          if (b) {
            florp(foo.__proto__);
          }
        }
      `.trim(),
      output: `
        import { __proto__ } from './foo';
        if (a) {
          if (b) {
            florp(__proto__);
          }
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
    tInvalid({
      code: `
        import * as foo from './foo';
        function outer() {
          const bar = 'name conflict';
          return function middle() {
            return function inner() {
              return foo.bar;
            };
          };
        }
      `.trim(),
      output: `
        import { bar as foo_bar } from './foo';
        function outer() {
          const bar = 'name conflict';
          return function middle() {
            return function inner() {
              return foo_bar;
            };
          };
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
    tInvalid({
      code: `
        import * as foo from './foo';
        florp(foo.bar, bar);
      `.trim(),
      output: `
        import { bar as foo_bar } from './foo';
        florp(foo_bar, bar);
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
      // a chosen local name must not collide with a later import's name
      code: `
        import * as foo from './foo';
        function f() {
          const a = 'local';
          return () => {
            foo.a;
            foo.foo_a;
          };
        }
      `.trim(),
      output: `
        import { a as foo_a, foo_a as foo_foo_a } from './foo';
        function f() {
          const a = 'local';
          return () => {
            foo_a;
            foo_foo_a;
          };
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
    tInvalid({
      code: `
        import * as foo from './foo';
        florp(foo.bar, foo.default);
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
        florp(foo['some-key']);
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
      // `foo[key]` reads the export named by the value of `key`, so there is no named import to swap it for
      code: "import * as foo from './foo';\nconst key = 'bar';\nflorp(foo[key]);",
      output: null,
      errors: [NO_NAMESPACE_ERROR],
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    }),
    tInvalid({
      code: "import * as foo from './foo';\nconst key = 'bar';\nflorp(foo.baz, foo[key]);",
      output: null,
      errors: [NO_NAMESPACE_ERROR],
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    }),
    tInvalid({
      code: "import * as foo from './foo';\nflorp(list[foo]);",
      output: null,
      errors: [NO_NAMESPACE_ERROR],
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    }),
    tInvalid({
      code: "import * as foo from './foo';\nflorp(foo[1]);",
      output: null,
      errors: [NO_NAMESPACE_ERROR],
      languageOptions: {
        parserOptions: { ecmaVersion: 2015, sourceType: 'module' },
      },
    }),
  ],
})
