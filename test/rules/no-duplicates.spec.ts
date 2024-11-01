import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import {
  test,
  parsers,
  tsVersionSatisfies,
  typescriptEslintParserSatisfies,
} from '../utils'

import jsxConfig from 'eslint-plugin-import-x/config/react'
import rule from 'eslint-plugin-import-x/rules/no-duplicates'

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-duplicates', rule, {
  valid: [
    test({
      code: 'import "./malformed.js"',
      languageOptions: { parser: require(parsers.ESPREE) },
    }),

    test({ code: "import { x } from './foo'; import { y } from './bar'" }),

    // #86: every unresolved module should not show up as 'null' and duplicate
    test({
      code: 'import foo from "234artaf"; import { shoop } from "234q25ad"',
    }),

    // #225: ignore duplicate if is a flow type import
    test({
      code: "import { x } from './foo'; import type { y } from './foo'",
      languageOptions: { parser: require(parsers.BABEL) },
    }),

    // #1107: Using different query strings that trigger different webpack loaders.
    test({
      code: "import x from './bar?optionX'; import y from './bar?optionY';",
      options: [{ considerQueryString: true }],
      settings: { 'import-x/resolver': 'webpack' },
    }),
    test({
      code: "import x from './foo'; import y from './bar';",
      options: [{ considerQueryString: true }],
      settings: { 'import-x/resolver': 'webpack' },
    }),

    // #1538: It is impossible to import namespace and other in one line, so allow this.
    test({
      code: "import * as ns from './foo'; import {y} from './foo'",
    }),
    test({
      code: "import {y} from './foo'; import * as ns from './foo'",
    }),
  ],
  invalid: [
    test({
      code: "import { x } from './foo'; import { y } from './foo'",
      output: "import { x , y } from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import {x} from './foo'; import {y} from './foo'; import { z } from './foo'",
      output: "import {x,y, z } from './foo';  ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    // ensure resolved path results in warnings
    test({
      code: "import { x } from './bar'; import { y } from 'bar';",
      output: "import { x , y } from './bar'; ",
      settings: {
        'import-x/resolve': {
          paths: [path.resolve('test/fixtures')],
        },
      },
      errors: 2, // path ends up hardcoded
    }),

    // #1107: Using different query strings that trigger different webpack loaders.
    test({
      code: "import x from './bar.js?optionX'; import y from './bar?optionX';",
      settings: { 'import-x/resolver': 'webpack' },
      errors: 2, // path ends up hardcoded
    }),
    test({
      code: "import x from './bar?optionX'; import y from './bar?optionY';",
      settings: { 'import-x/resolver': 'webpack' },
      errors: 2, // path ends up hardcoded
    }),

    // #1107: Using same query strings that trigger the same loader.
    test({
      code: "import x from './bar?optionX'; import y from './bar.js?optionX';",
      options: [{ considerQueryString: true }],
      settings: { 'import-x/resolver': 'webpack' },
      errors: 2, // path ends up hardcoded
    }),

    // #86: duplicate unresolved modules should be flagged
    test({
      // Autofix bail because of different default import names.
      code: "import foo from 'non-existent'; import bar from 'non-existent';",
      languageOptions: { parser: require(parsers.ESPREE) },
      errors: [
        "'non-existent' imported multiple times.",
        "'non-existent' imported multiple times.",
      ],
    }),

    test({
      code: "import type { x } from './foo'; import type { y } from './foo'",
      output: "import type { x , y } from './foo'; ",
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import './foo'; import './foo'",
      output: "import './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import { x, /* x */ } from './foo'; import {//y\ny//y2\n} from './foo'",
      output: "import { x, /* x */ //y\ny//y2\n} from './foo'; ",
      languageOptions: { parser: require(parsers.ESPREE) },
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import {x} from './foo'; import {} from './foo'",
      output: "import {x} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    // #2347: duplicate identifiers should be removed
    test({
      code: "import {a} from './foo'; import { a } from './foo'",
      output: "import {a} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    // #2347: duplicate identifiers should be removed
    test({
      code: "import {a,b} from './foo'; import { b, c } from './foo'; import {b,c,d} from './foo'",
      output: "import {a,b, c ,d} from './foo';  ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    // #2347: duplicate identifiers should be removed, but not if they are adjacent to comments
    test({
      code: "import {a} from './foo'; import { a/*,b*/ } from './foo'",
      output: "import {a, a/*,b*/ } from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import {x} from './foo'; import {} from './foo'; import {/*c*/} from './foo'; import {y} from './foo'",
      output: "import {x/*c*/,y} from './foo';   ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import { } from './foo'; import {x} from './foo'",
      output: "import { x} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import './foo'; import {x} from './foo'",
      output: "import {x} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import'./foo'; import {x} from './foo'",
      output: "import {x} from'./foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import './foo'; import { /*x*/} from './foo'; import {//y\n} from './foo'; import {z} from './foo'",
      output: "import { /*x*///y\nz} from './foo';   ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import './foo'; import def, {x} from './foo'",
      output: "import def, {x} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import './foo'; import def from './foo'",
      output: "import def from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import def from './foo'; import {x} from './foo'",
      output: "import def, {x} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import {x} from './foo'; import def from './foo'",
      output: "import def, {x} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import{x} from './foo'; import def from './foo'",
      output: "import def,{x} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import {x} from './foo'; import def, {y} from './foo'",
      output: "import def, {x,y} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because cannot merge namespace imports.
      code: "import * as ns1 from './foo'; import * as ns2 from './foo'",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import * as ns from './foo'; import {x} from './foo'; import {y} from './foo'",
      // Autofix could merge some imports, but not the namespace import.
      output: "import * as ns from './foo'; import {x,y} from './foo'; ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: "import {x} from './foo'; import * as ns from './foo'; import {y} from './foo'; import './foo'",
      // Autofix could merge some imports, but not the namespace import.
      output: "import {x,y} from './foo'; import * as ns from './foo';  ",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        // some-tool-disable-next-line
        import {x} from './foo'
        import {//y\ny} from './foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        // some-tool-disable-next-line
        import {y} from './foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo' // some-tool-disable-line
        import {y} from './foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        import {y} from './foo' // some-tool-disable-line
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        /* comment */ import {y} from './foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        import {y} from './foo' /* comment
        multiline */
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: `
import {x} from './foo'
import {y} from './foo'
// some-tool-disable-next-line
      `,
      // Not autofix bail.
      output: `
import {x,y} from './foo'
// some-tool-disable-next-line
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: `
import {x} from './foo'
// comment

import {y} from './foo'
      `,
      // Not autofix bail.
      output: `
import {x,y} from './foo'
// comment

      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        import/* comment */{y} from './foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        import/* comment */'./foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        import{y}/* comment */from './foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from './foo'
        import{y}from/* comment */'./foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      // Autofix bail because of comment.
      code: `
        import {x} from
        // some-tool-disable-next-line
        './foo'
        import {y} from './foo'
      `,
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    // #2027 long import list generate empty lines
    test({
      code: "import { Foo } from './foo';\nimport { Bar } from './foo';\nexport const value = {}",
      output: "import { Foo , Bar } from './foo';\nexport const value = {}",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    // #2027 long import list generate empty lines
    test({
      code: "import { Foo } from './foo';\nimport Bar from './foo';\nexport const value = {}",
      output: "import Bar, { Foo } from './foo';\nexport const value = {}",
      errors: [
        "'./foo' imported multiple times.",
        "'./foo' imported multiple times.",
      ],
    }),

    test({
      code: `
import {
  DEFAULT_FILTER_KEYS,
  BULK_DISABLED,
} from '../constants';
import React from 'react';
import {
  BULK_ACTIONS_ENABLED
} from '../constants';

const TestComponent = () => {
  return <div>
  </div>;
}

export default TestComponent;
      `,
      output: `
import {
  DEFAULT_FILTER_KEYS,
  BULK_DISABLED,

  BULK_ACTIONS_ENABLED
} from '../constants';
import React from 'react';

const TestComponent = () => {
  return <div>
  </div>;
}

export default TestComponent;
      `,
      errors: [
        "'../constants' imported multiple times.",
        "'../constants' imported multiple times.",
      ],
      ...jsxConfig,
    }),

    test({
      code: `
        import {A1,} from 'foo';
        import {B1,} from 'foo';
        import {C1,} from 'foo';

        import {
          A2,
        } from 'bar';
        import {
          B2,
        } from 'bar';
        import {
          C2,
        } from 'bar';

      `,
      output: `
        import {A1,B1,C1} from 'foo';
                ${''}
        import {
          A2,
        ${''}
          B2,
          C2} from 'bar';
                ${''}
      `,
      errors: [
        {
          message: "'foo' imported multiple times.",
          line: 2,
          column: 27,
        },
        {
          message: "'foo' imported multiple times.",
          line: 3,
          column: 27,
        },
        {
          message: "'foo' imported multiple times.",
          line: 4,
          column: 27,
        },
        {
          message: "'bar' imported multiple times.",
          line: 8,
          column: 16,
        },
        {
          message: "'bar' imported multiple times.",
          line: 11,
          column: 16,
        },
        {
          message: "'bar' imported multiple times.",
          line: 14,
          column: 16,
        },
      ],
      ...jsxConfig,
    }),
  ],
})

describe('TypeScript', () => {
  const parserConfig = {
    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }

  const valid = [
    // #1667: ignore duplicate if is a typescript type import
    test({
      code: "import type { x } from './foo'; import y from './foo'",
      ...parserConfig,
    }),
    test({
      code: "import type { x } from './foo'; import type * as y from './foo'",
      ...parserConfig,
    }),
    test({
      code: "import type x from './foo'; import type y from './bar'",
      ...parserConfig,
    }),
    test({
      code: "import type {x} from './foo'; import type {y} from './bar'",
      ...parserConfig,
    }),
    test({
      code: "import type x from './foo'; import type {y} from './foo'",
      ...parserConfig,
    }),
    test({
      code: `
        import type {} from './module';
        import {} from './module2';
      `,
      ...parserConfig,
    }),
    test({
      code: `
        import type { Identifier } from 'module';

        declare module 'module2' {
          import type { Identifier } from 'module';
        }

        declare module 'module3' {
          import type { Identifier } from 'module';
        }
      `,
      ...parserConfig,
    }),
    ...(!tsVersionSatisfies('>= 4.5') ||
    !typescriptEslintParserSatisfies('>= 5.7.0')
      ? []
      : [
          // #2470: ignore duplicate if is a typescript inline type import
          test({
            code: "import { type x } from './foo'; import y from './foo'",
            ...parserConfig,
          }),
          test({
            code: "import { type x } from './foo'; import { y } from './foo'",
            ...parserConfig,
          }),
          test({
            code: "import { type x } from './foo'; import type y from 'foo'",
            ...parserConfig,
          }),
        ]),
    test({
      code: "import type { A } from 'foo';import type B from 'foo';",
      ...parserConfig,
      options: [{ 'prefer-inline': true }],
    }),
    test({
      code: "import { type A } from 'foo';import type B from 'foo';",
      ...parserConfig,
      options: [{ 'prefer-inline': true }],
    }),
    test({
      code: "import type A from 'foo';import { B } from 'foo';",
      ...parserConfig,
      options: [{ 'prefer-inline': true }],
    }),
  ]

  const invalid = [
    test({
      code: "import type x from './foo'; import type y from './foo'",
      ...parserConfig,
      errors: [
        {
          line: 1,
          column: 20,
          message: "'./foo' imported multiple times.",
        },
        {
          line: 1,
          column: 48,
          message: "'./foo' imported multiple times.",
        },
      ],
    }),
    test({
      code: "import type x from './foo'; import type x from './foo'",
      output: "import type x from './foo'; ",
      ...parserConfig,
      errors: [
        {
          line: 1,
          column: 20,
          message: "'./foo' imported multiple times.",
        },
        {
          line: 1,
          column: 48,
          message: "'./foo' imported multiple times.",
        },
      ],
    }),
    test({
      code: "import type {x} from './foo'; import type {y} from './foo'",
      ...parserConfig,
      output: `import type {x,y} from './foo'; `,
      errors: [
        {
          line: 1,
          column: 22,
          message: "'./foo' imported multiple times.",
        },
        {
          line: 1,
          column: 52,
          message: "'./foo' imported multiple times.",
        },
      ],
    }),
    ...(!tsVersionSatisfies('>= 4.5') ||
    !typescriptEslintParserSatisfies('>= 5.7.0')
      ? []
      : [
          test({
            code: "import {type x} from './foo'; import type {y} from './foo'",
            ...parserConfig,
            options: [{ 'prefer-inline': false }],
            output: `import {type x,y} from './foo'; `,
            errors: [
              {
                line: 1,
                column: 22,
                message: "'./foo' imported multiple times.",
              },
              {
                line: 1,
                column: 52,
                message: "'./foo' imported multiple times.",
              },
            ],
          }),
          test({
            code: "import type {x} from 'foo'; import {type y} from 'foo'",
            ...parserConfig,
            options: [{ 'prefer-inline': true }],
            output: `import {type x,type y} from 'foo'; `,
            errors: [
              {
                line: 1,
                column: 22,
                message: "'foo' imported multiple times.",
              },
              {
                line: 1,
                column: 50,
                message: "'foo' imported multiple times.",
              },
            ],
          }),
          test({
            code: "import {type x} from 'foo'; import type {y} from 'foo'",
            ...parserConfig,
            options: [{ 'prefer-inline': true }],
            output: `import {type x,type y} from 'foo'; `,
            errors: [
              {
                line: 1,
                column: 22,
                message: "'foo' imported multiple times.",
              },
              {
                line: 1,
                column: 50,
                message: "'foo' imported multiple times.",
              },
            ],
          }),
          test({
            code: "import {type x} from 'foo'; import type {y} from 'foo'",
            ...parserConfig,
            output: `import {type x,y} from 'foo'; `,
            errors: [
              {
                line: 1,
                column: 22,
                message: "'foo' imported multiple times.",
              },
              {
                line: 1,
                column: 50,
                message: "'foo' imported multiple times.",
              },
            ],
          }),
          test({
            code: "import {type x} from './foo'; import {type y} from './foo'",
            ...parserConfig,
            options: [{ 'prefer-inline': true }],
            output: `import {type x,type y} from './foo'; `,
            errors: [
              {
                line: 1,
                column: 22,
                message: "'./foo' imported multiple times.",
              },
              {
                line: 1,
                column: 52,
                message: "'./foo' imported multiple times.",
              },
            ],
          }),
          test({
            code: "import {type x} from './foo'; import {type y} from './foo'",
            ...parserConfig,
            output: `import {type x,type y} from './foo'; `,
            errors: [
              {
                line: 1,
                column: 22,
                message: "'./foo' imported multiple times.",
              },
              {
                line: 1,
                column: 52,
                message: "'./foo' imported multiple times.",
              },
            ],
          }),
          test({
            code: "import {AValue, type x, BValue} from './foo'; import {type y} from './foo'",
            ...parserConfig,
            output: `import {AValue, type x, BValue,type y} from './foo'; `,
            errors: [
              {
                line: 1,
                column: 38,
                message: "'./foo' imported multiple times.",
              },
              {
                line: 1,
                column: 68,
                message: "'./foo' imported multiple times.",
              },
            ],
          }),
          // #2834 Detect duplicates across type and regular imports
          test({
            code: "import {AValue} from './foo'; import type {AType} from './foo'",
            ...parserConfig,
            options: [{ 'prefer-inline': true }],
            output: `import {AValue,type AType} from './foo'; `,
            errors: [
              {
                line: 1,
                column: 22,
                message: "'./foo' imported multiple times.",
              },
              {
                line: 1,
                column: 56,
                message: "'./foo' imported multiple times.",
              },
            ],
          }),
        ]),
  ]

  ruleTester.run('no-duplicates', rule, {
    valid,
    invalid,
  })
})
