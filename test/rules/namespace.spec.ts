import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { test, SYNTAX_VALID_CASES, testFilePath, parsers } from '../utils'

import rule from 'eslint-plugin-import-x/rules/namespace'

const ruleTester = new TSESLintRuleTester({
  languageOptions: {
    parserOptions: { env: { es6: true } },
  },
})

function error(name: string, namespace: string) {
  return {
    message: `'${name}' not found in imported namespace '${namespace}'.`,
  }
}

const valid = [
  test({
    code: 'import "./malformed.js"',
    languageOptions: { parser: require(parsers.ESPREE) },
  }),

  test({ code: "import * as foo from './empty-folder';" }),
  test({
    code: 'import * as names from "./named-exports"; console.log((names.b).c); ',
  }),

  test({
    code: 'import * as names from "./named-exports"; console.log(names.a);',
  }),
  test({
    code: 'import * as names from "./re-export-names"; console.log(names.foo);',
  }),
  test({
    code: "import * as elements from './jsx';",
    languageOptions: {
      parserOptions: {
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2015,
      },
    },
  }),
  // import re-exported jsx files, where jsx file exports a string
  test({
    code: `
      import * as foo from "./jsx/re-export.js";
      console.log(foo.jsxFoo);
    `,
    settings: {
      'import-x/extensions': ['.js', '.jsx'],
    },
  }),
  // import re-exported jsx files, where jsx files export functions that return html tags
  test({
    code: `
      import * as foo from "./jsx/bar/index.js";
      console.log(foo.Baz1);
      console.log(foo.Baz2);
      console.log(foo.Qux1);
      console.log(foo.Qux2);
    `,
    settings: {
      'import-x/extensions': ['.js', '.jsx'],
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  }),

  test({ code: "import * as foo from './common';" }),

  // destructuring namespaces
  test({
    code: 'import * as names from "./named-exports"; const { a } = names',
  }),
  test({
    code: 'import * as names from "./named-exports"; const { d: c } = names',
  }),
  test({
    code: `
      import * as names from "./named-exports";
      const { c } = foo,
        { length } = "names",
        alt = names;
      `,
  }),
  // deep destructuring only cares about top level
  test({
    code: 'import * as names from "./named-exports"; const { ExportedClass: { length } } = names',
  }),

  // detect scope redefinition
  test({
    code: 'import * as names from "./named-exports"; function b(names) { const { c } = names }',
  }),
  test({
    code: 'import * as names from "./named-exports"; function b() { let names = null; const { c } = names }',
  }),
  test({
    code: 'import * as names from "./named-exports"; const x = function names() { const { c } = names }',
  }),

  /////////
  // es7 //
  /////////
  test({
    code: 'export * as names from "./named-exports"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),
  test({
    code: 'export defport, * as names from "./named-exports"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),
  // non-existent is handled by no-unresolved
  test({
    code: 'export * as names from "./does-not-exist"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  test({
    code: 'import * as Endpoints from "./issue-195/Endpoints"; console.log(Endpoints.Users)',
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  // respect hoisting
  test({
    code: 'function x() { console.log((names.b).c); } import * as names from "./named-exports"; ',
  }),

  // names.default is valid export
  test({ code: "import * as names from './default-export';" }),
  test({
    code: "import * as names from './default-export'; console.log(names.default)",
    languageOptions: { parser: require(parsers.ESPREE) },
  }),
  test({
    code: 'export * as names from "./default-export"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),
  test({
    code: 'export defport, * as names from "./default-export"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  // #456: optionally ignore computed references
  test({
    code: `import * as names from './named-exports'; console.log(names['a']);`,
    options: [{ allowComputed: true }],
  }),

  // #656: should handle object-rest properties
  test({
    code: `import * as names from './named-exports'; const {a, b, ...rest} = names;`,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2018,
      },
    },
  }),
  test({
    code: `import * as names from './named-exports'; const {a, b, ...rest} = names;`,
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  // #1144: should handle re-export CommonJS as namespace
  test({
    code: `import * as ns from './re-export-common'; const {foo} = ns;`,
  }),

  // JSX
  test({
    code: 'import * as Names from "./named-exports"; const Foo = <Names.a/>',
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  }),

  // Typescript
  test({
    code: `
      import * as foo from "./typescript-declare-nested"
      foo.bar.MyFunction()
    `,

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  test({
    code: `import { foobar } from "./typescript-declare-interface"`,

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  test({
    code: 'export * from "typescript/lib/typescript.d"',

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  test({
    code: 'export = function name() {}',

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  ...SYNTAX_VALID_CASES,

  test({
    code: `
    import * as color from './color';
    export const getBackgroundFromColor = (color) => color.bg;
    export const getExampleColor = () => color.example
    `,
  }),

  test({
    code: `
    import * as middle from './middle';

    console.log(middle.myName);
  `,
    filename: testFilePath('export-star-2/downstream.js'),
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
      },
    },
  }),

  test({
    code: "import * as names from './default-export-string';",
    languageOptions: {
      parser: require(parsers.BABEL),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  test({
    code: "import * as names from './default-export-string'; console.log(names.default)",
    languageOptions: {
      parser: require(parsers.BABEL),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  test({
    code: "import * as names from './default-export-namespace-string';",
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  test({
    code: "import * as names from './default-export-namespace-string'; console.log(names.default)",
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  test({
    code: `import { "b" as b } from "./deep/a"; console.log(b.c.d.e)`,
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  test({
    code: `import { "b" as b } from "./deep/a"; var {c:{d:{e}}} = b`,
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
]

const invalid = [
  test({
    code: "import * as names from './named-exports'; console.log(names.c)",
    errors: [error('c', 'names')],
  }),

  test({
    code: "import * as names from './named-exports'; console.log(names['a']);",
    errors: [
      "Unable to validate computed reference to imported namespace 'names'.",
    ],
  }),

  // assignment warning (from no-reassign)
  test({
    code: "import * as foo from './bar'; foo.foo = 'y';",
    errors: [{ message: "Assignment to member of namespace 'foo'." }],
  }),
  test({
    code: "import * as foo from './bar'; foo.x = 'y';",
    errors: [
      "Assignment to member of namespace 'foo'.",
      "'x' not found in imported namespace 'foo'.",
    ],
  }),

  // invalid destructuring
  test({
    code: 'import * as names from "./named-exports"; const { c } = names',
    errors: [
      {
        type: 'Property',
        message: "'c' not found in imported namespace 'names'.",
      },
    ],
  }),
  test({
    code: 'import * as names from "./named-exports"; function b() { const { c } = names }',
    errors: [
      {
        type: 'Property',
        message: "'c' not found in imported namespace 'names'.",
      },
    ],
  }),
  test({
    code: 'import * as names from "./named-exports"; const { c: d } = names',
    errors: [
      {
        type: 'Property',
        message: "'c' not found in imported namespace 'names'.",
      },
    ],
  }),
  test({
    code: 'import * as names from "./named-exports"; const { c: { d } } = names',
    errors: [
      {
        type: 'Property',
        message: "'c' not found in imported namespace 'names'.",
      },
    ],
  }),

  /////////
  // es7 //
  /////////

  test({
    code: 'import * as Endpoints from "./issue-195/Endpoints"; console.log(Endpoints.Foo)',
    languageOptions: { parser: require(parsers.BABEL) },
    errors: ["'Foo' not found in imported namespace 'Endpoints'."],
  }),

  // parse errors
  test({
    code: "import * as namespace from './malformed.js';",
    languageOptions: {
      parser: require(parsers.ESPREE),
    },
    errors: [
      {
        message:
          "Parse errors in imported module './malformed.js': 'return' outside of function (1:1)",
        type: 'Literal',
      },
    ],
  }),

  test({
    code: "import b from './deep/default'; console.log(b.e)",
    errors: ["'e' not found in imported namespace 'b'."],
  }),

  // respect hoisting
  test({
    code: `console.log(names.c); import * as names from './named-exports';`,
    errors: [error('c', 'names')],
  }),
  test({
    code: `function x() { console.log(names.c) } import * as names from './named-exports';`,
    errors: [error('c', 'names')],
  }),

  // #328: * exports do not include default
  test({
    code: 'import * as ree from "./re-export"; console.log(ree.default)',
    errors: [`'default' not found in imported namespace 'ree'.`],
  }),

  // JSX
  test({
    code: 'import * as Names from "./named-exports"; const Foo = <Names.e/>',
    errors: [error('e', 'Names')],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  }),

  test({
    code: `import { "b" as b } from "./deep/a"; console.log(b.e)`,
    errors: ["'e' not found in imported namespace 'b'."],
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  test({
    code: `import { "b" as b } from "./deep/a"; console.log(b.c.e)`,
    errors: ["'e' not found in deeply imported namespace 'b.c'."],
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
]

///////////////////////
// deep dereferences //
//////////////////////
for (const [folder, parser] of [['deep'], ['deep-es7', parsers.BABEL]]) {
  // close over params
  valid.push(
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.c.d.e)`,
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; console.log(b.c.d.e)`,
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.c.d.e.f)`,
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; var {b:{c:{d:{e}}}} = a`,
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; var {c:{d:{e}}} = b`,
    }),
    // deep namespaces should include explicitly exported defaults
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.default)`,
    }),
  )

  invalid.push(
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.e)`,
      errors: ["'e' not found in deeply imported namespace 'a.b'."],
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; console.log(b.e)`,
      errors: ["'e' not found in imported namespace 'b'."],
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.c.e)`,
      errors: ["'e' not found in deeply imported namespace 'a.b.c'."],
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; console.log(b.c.e)`,
      errors: ["'e' not found in deeply imported namespace 'b.c'."],
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; var {b:{ e }} = a`,
      errors: ["'e' not found in deeply imported namespace 'a.b'."],
    }),
    test({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; var {b:{c:{ e }}} = a`,
      errors: ["'e' not found in deeply imported namespace 'a.b.c'."],
    }),
  )
}

ruleTester.run('namespace', rule, { valid, invalid })
