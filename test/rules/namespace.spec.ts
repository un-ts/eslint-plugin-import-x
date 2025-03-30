import { cjsRequire as require } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  SYNTAX_VALID_CASES,
  testFilePath,
  parsers,
} from '../utils.js'
import type { GetRuleModuleMessageIds, RuleRunTests } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/namespace'

const ruleTester = new TSESLintRuleTester({
  languageOptions: {
    parserOptions: { env: { es6: true } },
  },
})

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createNotFoundInNamespaceError(
  name: string,
  namespace: string,
  type?: `${AST_NODE_TYPES}`,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'notFoundInNamespace',
    data: { name, namepath: namespace },
    type: type as AST_NODE_TYPES,
  }
}

function createNotFoundInNamespaceDeepError(
  name: string,
  namespace: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'notFoundInNamespaceDeep',
    data: { name, namepath: namespace },
  }
}

let valid: RuleRunTests<typeof rule>['valid'] = [
  tValid({
    code: 'import "./malformed.js"',
    languageOptions: { parser: require(parsers.ESPREE) },
  }),

  tValid({ code: "import * as foo from './empty-folder';" }),
  tValid({
    code: 'import * as names from "./named-exports"; console.log((names.b).c); ',
  }),

  tValid({
    code: 'import * as names from "./named-exports"; console.log(names.a);',
  }),
  tValid({
    code: 'import * as names from "./re-export-names"; console.log(names.foo);',
  }),
  tValid({
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
  tValid({
    code: `
      import * as foo from "./jsx/re-export.js";
      console.log(foo.jsxFoo);
    `,
    settings: {
      'import-x/extensions': ['.js', '.jsx'],
    },
  }),
  // import re-exported jsx files, where jsx files export functions that return html tags
  tValid({
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

  tValid({ code: "import * as foo from './common';" }),

  // destructuring namespaces
  tValid({
    code: 'import * as names from "./named-exports"; const { a } = names',
  }),
  tValid({
    code: 'import * as names from "./named-exports"; const { d: c } = names',
  }),
  tValid({
    code: `
      import * as names from "./named-exports";
      const { c } = foo,
        { length } = "names",
        alt = names;
      `,
  }),
  // deep destructuring only cares about top level
  tValid({
    code: 'import * as names from "./named-exports"; const { ExportedClass: { length } } = names',
  }),

  // detect scope redefinition
  tValid({
    code: 'import * as names from "./named-exports"; function b(names) { const { c } = names }',
  }),
  tValid({
    code: 'import * as names from "./named-exports"; function b() { let names = null; const { c } = names }',
  }),
  tValid({
    code: 'import * as names from "./named-exports"; const x = function names() { const { c } = names }',
  }),

  /////////
  // es7 //
  /////////
  tValid({
    code: 'export * as names from "./named-exports"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),
  tValid({
    code: 'export defport, * as names from "./named-exports"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),
  // non-existent is handled by no-unresolved
  tValid({
    code: 'export * as names from "./does-not-exist"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  tValid({
    code: 'import * as Endpoints from "./issue-195/Endpoints"; console.log(Endpoints.Users)',
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  // respect hoisting
  tValid({
    code: 'function x() { console.log((names.b).c); } import * as names from "./named-exports"; ',
  }),

  // names.default is valid export
  tValid({ code: "import * as names from './default-export';" }),
  tValid({
    code: "import * as names from './default-export'; console.log(names.default)",
    languageOptions: { parser: require(parsers.ESPREE) },
  }),
  tValid({
    code: 'export * as names from "./default-export"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),
  tValid({
    code: 'export defport, * as names from "./default-export"',
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  // #456: optionally ignore computed references
  tValid({
    code: `import * as names from './named-exports'; console.log(names['a']);`,
    options: [{ allowComputed: true }],
  }),

  // #656: should handle object-rest properties
  tValid({
    code: `import * as names from './named-exports'; const {a, b, ...rest} = names;`,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2018,
      },
    },
  }),
  tValid({
    code: `import * as names from './named-exports'; const {a, b, ...rest} = names;`,
    languageOptions: { parser: require(parsers.BABEL) },
  }),

  // #1144: should handle re-export CommonJS as namespace
  tValid({
    code: `import * as ns from './re-export-common'; const {foo} = ns;`,
  }),

  // JSX
  tValid({
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
  tValid({
    code: `
      import * as foo from "./typescript-declare-nested"
      foo.bar.MyFunction()
    `,

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  tValid({
    code: `import { foobar } from "./typescript-declare-interface"`,

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  tValid({
    code: 'export * from "typescript/lib/typescript.d"',

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  tValid({
    code: 'export = function name() {}',

    settings: {
      'import-x/parsers': { [parsers.TS]: ['.ts'] },
      'import-x/resolver': { 'eslint-import-resolver-typescript': true },
    },
  }),

  ...(SYNTAX_VALID_CASES as RuleRunTests<typeof rule>['valid']),

  tValid({
    code: `
    import * as color from './color';
    export const getBackgroundFromColor = (color) => color.bg;
    export const getExampleColor = () => color.example
    `,
  }),

  tValid({
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

  tValid({
    code: "import * as names from './default-export-string';",
    languageOptions: {
      parser: require(parsers.BABEL),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  tValid({
    code: "import * as names from './default-export-string'; console.log(names.default)",
    languageOptions: {
      parser: require(parsers.BABEL),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  tValid({
    code: "import * as names from './default-export-namespace-string';",
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  tValid({
    code: "import * as names from './default-export-namespace-string'; console.log(names.default)",
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  tValid({
    code: `import { "b" as b } from "./deep/a"; console.log(b.c.d.e)`,
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  tValid({
    code: `import { "b" as b } from "./deep/a"; var {c:{d:{e}}} = b`,
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
]

let invalid: RuleRunTests<typeof rule>['invalid'] = [
  tInvalid({
    code: "import * as names from './named-exports'; console.log(names.c)",
    errors: [createNotFoundInNamespaceError('c', 'names')],
  }),

  tInvalid({
    code: "import * as names from './named-exports'; console.log(names['a']);",
    errors: [{ messageId: 'computedReference', data: { namespace: 'names' } }],
  }),

  // assignment warning (from no-reassign)
  tInvalid({
    code: "import * as foo from './bar'; foo.foo = 'y';",
    errors: [{ messageId: 'namespaceMember', data: { namespace: 'foo' } }],
  }),
  tInvalid({
    code: "import * as foo from './bar'; foo.x = 'y';",
    errors: [
      { messageId: 'namespaceMember', data: { namespace: 'foo' } },
      createNotFoundInNamespaceError('x', 'foo'),
    ],
  }),

  // invalid destructuring
  tInvalid({
    code: 'import * as names from "./named-exports"; const { c } = names',
    errors: [createNotFoundInNamespaceError('c', 'names', 'Property')],
  }),
  tInvalid({
    code: 'import * as names from "./named-exports"; function b() { const { c } = names }',
    errors: [createNotFoundInNamespaceError('c', 'names', 'Property')],
  }),
  tInvalid({
    code: 'import * as names from "./named-exports"; const { c: d } = names',
    errors: [createNotFoundInNamespaceError('c', 'names', 'Property')],
  }),
  tInvalid({
    code: 'import * as names from "./named-exports"; const { c: { d } } = names',
    errors: [createNotFoundInNamespaceError('c', 'names', 'Property')],
  }),

  /////////
  // es7 //
  /////////

  tInvalid({
    code: 'import * as Endpoints from "./issue-195/Endpoints"; console.log(Endpoints.Foo)',
    languageOptions: { parser: require(parsers.BABEL) },
    errors: [createNotFoundInNamespaceError('Foo', 'Endpoints')],
  }),

  // parse errors
  tInvalid({
    code: "import * as namespace from './malformed.js';",
    languageOptions: {
      parser: require(parsers.ESPREE),
    },
    errors: [
      {
        // @ts-expect-error testing parsing error
        message:
          "Parse errors in imported module './malformed.js': 'return' outside of function (1:1)",
        type: AST_NODE_TYPES.Literal,
      },
    ],
  }),

  tInvalid({
    code: "import b from './deep/default'; console.log(b.e)",
    errors: [createNotFoundInNamespaceError('e', 'b')],
  }),

  // respect hoisting
  tInvalid({
    code: `console.log(names.c); import * as names from './named-exports';`,
    errors: [createNotFoundInNamespaceError('c', 'names')],
  }),
  tInvalid({
    code: `function x() { console.log(names.c) } import * as names from './named-exports';`,
    errors: [createNotFoundInNamespaceError('c', 'names')],
  }),

  // #328: * exports do not include default
  tInvalid({
    code: 'import * as ree from "./re-export"; console.log(ree.default)',
    errors: [createNotFoundInNamespaceError('default', 'ree')],
  }),

  // JSX
  tInvalid({
    code: 'import * as Names from "./named-exports"; const Foo = <Names.e/>',
    errors: [createNotFoundInNamespaceError('e', 'Names')],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  }),

  tInvalid({
    code: `import { "b" as b } from "./deep/a"; console.log(b.e)`,
    errors: [createNotFoundInNamespaceError('e', 'b')],
    languageOptions: {
      parser: require(parsers.ESPREE),
      parserOptions: { ecmaVersion: 2022 },
    },
  }),
  tInvalid({
    code: `import { "b" as b } from "./deep/a"; console.log(b.c.e)`,
    errors: [createNotFoundInNamespaceDeepError('e', 'b.c')],
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
  valid = [
    ...valid,
    tValid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.c.d.e)`,
    }),
    tValid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; console.log(b.c.d.e)`,
    }),
    tValid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.c.d.e.f)`,
    }),
    tValid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; var {b:{c:{d:{e}}}} = a`,
    }),
    tValid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; var {c:{d:{e}}} = b`,
    }),
    // deep namespaces should include explicitly exported defaults
    tValid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.default)`,
    }),
  ]

  invalid = [
    ...invalid,
    tInvalid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.e)`,
      errors: [createNotFoundInNamespaceDeepError('e', 'a.b')],
    }),
    tInvalid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; console.log(b.e)`,
      errors: [createNotFoundInNamespaceError('e', 'b')],
    }),
    tInvalid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; console.log(a.b.c.e)`,
      errors: [createNotFoundInNamespaceDeepError('e', 'a.b.c')],
    }),
    tInvalid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import { b } from "./${folder}/a"; console.log(b.c.e)`,
      errors: [createNotFoundInNamespaceDeepError('e', 'b.c')],
    }),
    tInvalid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; var {b:{ e }} = a`,
      errors: [createNotFoundInNamespaceDeepError('e', 'a.b')],
    }),
    tInvalid({
      languageOptions: { ...(parser && { parser: require(parser) }) },
      code: `import * as a from "./${folder}/a"; var {b:{c:{ e }}} = a`,
      errors: [createNotFoundInNamespaceDeepError('e', 'a.b.c')],
    }),
  ]
}

ruleTester.run('namespace', rule, { valid, invalid })
