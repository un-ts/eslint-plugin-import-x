import fs from 'node:fs'

import { jest } from '@jest/globals'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'
// eslint-disable-next-line import-x/default -- incorrect types
import eslint8UnsupportedApi from 'eslint8.56/use-at-your-own-risk'
import { RuleTester as ESLint9_FlatRuleTester } from 'eslint9'

import { createRuleTestCaseFunctions, testFilePath, parsers } from '../utils.js'
import type { GetRuleModuleOptions, GetRuleModuleMessageIds } from '../utils.js'

import { cjsRequire as require } from 'eslint-plugin-import-x'
import jsxConfig from 'eslint-plugin-import-x/config/flat/react'
import typescriptConfig from 'eslint-plugin-import-x/config/flat/typescript'
import rule from 'eslint-plugin-import-x/rules/no-unused-modules'

const ruleTester = new TSESLintRuleTester()
const typescriptRuleTester = new TSESLintRuleTester(typescriptConfig)
const jsxRuleTester = new TSESLintRuleTester(jsxConfig)

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

type RuleOptions = GetRuleModuleOptions<typeof rule>

const missingExportsOptions: RuleOptions = [
  {
    missingExports: true,
  },
]

const unusedExportsOptions: RuleOptions = [
  {
    unusedExports: true,
    src: [testFilePath('./no-unused-modules/**/*.js')],
    ignoreExports: [testFilePath('./no-unused-modules/*ignored*.js')],
  },
]

const unusedExportsTypescriptOptions: RuleOptions = [
  {
    unusedExports: true,
    src: [testFilePath('./no-unused-modules/typescript')],
    ignoreExports: undefined,
  },
]

const unusedExportsTypescriptIgnoreUnusedTypesOptions: RuleOptions = [
  {
    unusedExports: true,
    ignoreUnusedTypeExports: true,
    src: [testFilePath('./no-unused-modules/typescript')],
    ignoreExports: undefined,
  },
]

const unusedExportsJsxOptions: RuleOptions = [
  {
    unusedExports: true,
    src: [testFilePath('./no-unused-modules/jsx')],
    ignoreExports: undefined,
  },
]

function createUnusedError(
  value: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'unused',
    data: { value },
  }
}

// tests for missing exports
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: 'export default function noOptions() {}',
    }),
    tValid({
      code: 'export default () => 1',
      options: missingExportsOptions,
    }),
    tValid({
      code: 'export const a = 1',
      options: missingExportsOptions,
    }),
    tValid({
      options: missingExportsOptions,
      code: 'const a = 1; export { a }',
    }),
    tValid({
      code: 'function a() { return true }; export { a }',
      options: missingExportsOptions,
    }),
    tValid({
      code: 'const a = 1; const b = 2; export { a, b }',
      options: missingExportsOptions,
    }),
    tValid({
      code: 'const a = 1; export default a',
      options: missingExportsOptions,
    }),
    tValid({
      code: 'export class Foo {}',
      options: missingExportsOptions,
    }),
    tValid({
      code: 'export const [foobar] = [];',
      options: missingExportsOptions,
    }),
    tValid({
      code: 'export const [foobar] = foobarFactory();',
      options: missingExportsOptions,
    }),
    tValid({
      code: `
      export default function NewComponent () {
        return 'I am new component'
        }
        `,
      options: missingExportsOptions,
    }),
  ],
  invalid: [
    tInvalid({
      code: 'const a = 1',
      options: missingExportsOptions,
      errors: [{ messageId: 'notFound' }],
    }),
    tInvalid({
      code: '/* const a = 1 */',
      options: missingExportsOptions,
      errors: [{ messageId: 'notFound' }],
    }),
  ],
})

// tests for exports
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: 'import { o2 } from "./file-o";export default () => 12',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-a.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export const b = 2',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-b.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'const c1 = 3; function c2() { return 3 }; export { c1, c2 }',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-c.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export function d() { return 4 }',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-d.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'export class q { q0() {} }',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-q.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'const e0 = 5; export { e0 as e }',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-e.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'const l0 = 5; const l = 10; export { l0 as l1, l }; export default () => {}',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-l.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'const o0 = 0; const o1 = 1; export { o0, o1 as o2 }; export default () => {}',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-o.js'),
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `
      export const [o0, o2] = createLoadingAndErrorSelectors(
        AUTH_USER
        );
        `,
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-o.js'),
    }),
  ],
  invalid: [
    tInvalid({
      options: unusedExportsOptions,
      code: `
        import eslint from 'eslint'
        import fileA from './file-a'
        import { b } from './file-b'
        import { c1, c2 } from './file-c'
        import { d } from './file-d'
        import { e } from './file-e'
        import { e2 } from './file-e'
        import { h2 } from './file-h'
        import * as l from './file-l'
        export * from './file-n'
        export { default, o0, o3 } from './file-o'
        export { p } from './file-p'
        import s from './file-s'
      `,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      errors: [
        { ...createUnusedError('default'), line: 12, column: 18 },
        { ...createUnusedError('o0'), line: 12, column: 27 },
        { ...createUnusedError('o3'), line: 12, column: 31 },
        { ...createUnusedError('p'), line: 13, column: 18 },
      ],
    }),
    tInvalid({
      options: unusedExportsOptions,
      code: `const n0 = 'n0'; const n1 = 42; export { n0, n1 }; export default () => {}`,
      filename: testFilePath('./no-unused-modules/file-n.js'),
      errors: [createUnusedError('default')],
    }),
  ],
})

// test for unused exports
ruleTester.run('no-unused-modules', rule, {
  valid: [],
  invalid: [
    tInvalid({
      options: unusedExportsOptions,
      code: 'export default () => 13',
      filename: testFilePath('./no-unused-modules/file-f.js'),
      errors: [createUnusedError('default')],
    }),
    tInvalid({
      options: unusedExportsOptions,
      code: 'export const g = 2',
      filename: testFilePath('./no-unused-modules/file-g.js'),
      errors: [createUnusedError('g')],
    }),
    tInvalid({
      options: unusedExportsOptions,
      code: 'const h1 = 3; function h2() { return 3 }; const h3 = true; export { h1, h2, h3 }',
      filename: testFilePath('./no-unused-modules/file-h.js'),
      errors: [createUnusedError('h1')],
    }),
    tInvalid({
      options: unusedExportsOptions,
      code: 'const i1 = 3; function i2() { return 3 }; export { i1, i2 }',
      filename: testFilePath('./no-unused-modules/file-i.js'),
      errors: [createUnusedError('i1'), createUnusedError('i2')],
    }),
    tInvalid({
      options: unusedExportsOptions,
      code: 'export function j() { return 4 }',
      filename: testFilePath('./no-unused-modules/file-j.js'),
      errors: [createUnusedError('j')],
    }),
    tInvalid({
      options: unusedExportsOptions,
      code: 'export class q { q0() {} }',
      filename: testFilePath('./no-unused-modules/file-q.js'),
      errors: [createUnusedError('q')],
    }),
    tInvalid({
      options: unusedExportsOptions,
      code: 'const k0 = 5; export { k0 as k }',
      filename: testFilePath('./no-unused-modules/file-k.js'),
      errors: [createUnusedError('k')],
    }),
  ],
})

describe('dynamic imports', () => {
  jest.setTimeout(10e3)

  // test for unused exports with `import()`
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        options: unusedExportsOptions,
        code: `
            export const a = 10
            export const b = 20
            export const c = 30
            const d = 40
            export default d
            `,
        languageOptions: { parser: require(parsers.BABEL) },
        filename: testFilePath('./no-unused-modules/exports-for-dynamic-js.js'),
      }),
    ],
    invalid: [
      tInvalid({
        options: unusedExportsOptions,
        code: `
        export const a = 10
        export const b = 20
        export const c = 30
        const d = 40
        export default d
        `,
        languageOptions: { parser: require(parsers.BABEL) },
        filename: testFilePath(
          './no-unused-modules/exports-for-dynamic-js-2.js',
        ),
        errors: [
          createUnusedError('a'),
          createUnusedError('b'),
          createUnusedError('c'),
          createUnusedError('default'),
        ],
      }),
    ],
  })
  typescriptRuleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        options: unusedExportsTypescriptOptions,
        code: `
            export const ts_a = 10
            export const ts_b = 20
            export const ts_c = 30
            const ts_d = 40
            export default ts_d
            `,
        filename: testFilePath(
          './no-unused-modules/typescript/exports-for-dynamic-ts.ts',
        ),
      }),
      tValid({
        code: `
        import App from './App';
      `,
        filename: testFilePath('./unused-modules-reexport-crash/src/index.tsx'),
        options: [{ unusedExports: true, ignoreExports: ['**/magic/**'] }],
      }),
    ],
    invalid: [],
  })
})

// // test for export from
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      options: unusedExportsOptions,
      code: `export { default } from './file-o'`,
      filename: testFilePath('./no-unused-modules/file-s.js'),
    }),
  ],
  invalid: [
    tInvalid({
      options: unusedExportsOptions,
      code: `export { k } from '${testFilePath(
        './no-unused-modules/file-k.js',
      )}'`,
      filename: testFilePath('./no-unused-modules/file-j.js'),
      errors: [createUnusedError('k')],
    }),
  ],
})

ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      options: unusedExportsOptions,
      code: 'const k0 = 5; export { k0 as k }',
      filename: testFilePath('./no-unused-modules/file-k.js'),
    }),
  ],
  invalid: [],
})

// test for ignored files
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: 'export default () => 14',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-ignored-a.js'),
    }),
    tValid({
      code: 'export const b = 2',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-ignored-b.js'),
    }),
    tValid({
      code: 'const c1 = 3; function c2() { return 3 }; export { c1, c2 }',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-ignored-c.js'),
    }),
    tValid({
      code: 'export function d() { return 4 }',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-ignored-d.js'),
    }),
    tValid({
      code: 'const f = 5; export { f as e }',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-ignored-e.js'),
    }),
    tValid({
      code: 'const l0 = 5; const l = 10; export { l0 as l1, l }; export default () => {}',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-ignored-l.js'),
    }),
  ],
  invalid: [],
})

// add named import for file with default export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import { f } from '${testFilePath(
        './no-unused-modules/file-f.js',
      )}'`,
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-0.js'),
    }),
  ],
  invalid: [
    tInvalid({
      code: 'export default () => 15',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-f.js'),
      errors: [createUnusedError('default')],
    }),
  ],
})

// add default import for file with default export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import f from '${testFilePath('./no-unused-modules/file-f.js')}'`,
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-0.js'),
    }),
    tValid({
      code: 'export default () => 16',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-f.js'),
    }),
  ],
  invalid: [],
})

// add default import for file with named export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import g from '${testFilePath(
        './no-unused-modules/file-g.js',
      )}';import {h} from '${testFilePath('./no-unused-modules/file-gg.js')}'`,
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-0.js'),
    }),
  ],
  invalid: [
    tInvalid({
      code: 'export const g = 2',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-g.js'),
      errors: [createUnusedError('g')],
    }),
  ],
})

// add named import for file with named export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import { g } from '${testFilePath(
        './no-unused-modules/file-g.js',
      )}'; import eslint from 'eslint'`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
    }),
    tValid({
      code: 'export const g = 2',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-g.js'),
    }),
  ],
  invalid: [],
})

// add different named import for file with named export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import { c } from '${testFilePath(
        './no-unused-modules/file-b.js',
      )}'`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
    }),
  ],
  invalid: [
    tInvalid({
      code: 'export const b = 2',
      filename: testFilePath('./no-unused-modules/file-b.js'),
      options: unusedExportsOptions,
      errors: [createUnusedError('b')],
    }),
  ],
})

// add renamed named import for file with named export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import { g as g1 } from '${testFilePath(
        './no-unused-modules/file-g.js',
      )}'; import eslint from 'eslint'`,
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-0.js'),
    }),
    tValid({
      code: 'export const g = 2',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-g.js'),
    }),
  ],
  invalid: [],
})

// add different renamed named import for file with named export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import { g1 as g } from '${testFilePath(
        './no-unused-modules/file-g.js',
      )}'`,
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-0.js'),
    }),
  ],
  invalid: [
    tInvalid({
      code: 'export const g = 2',
      options: unusedExportsOptions,
      filename: testFilePath('./no-unused-modules/file-g.js'),
      errors: [createUnusedError('g')],
    }),
  ],
})

// remove default import for file with default export
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import { a1, a2 } from '${testFilePath(
        './no-unused-modules/file-a.js',
      )}'`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
    }),
  ],
  invalid: [
    tInvalid({
      code: 'export default () => 17',
      filename: testFilePath('./no-unused-modules/file-a.js'),
      options: unusedExportsOptions,
      errors: [createUnusedError('default')],
    }),
  ],
})

// add namespace import for file with unused exports
ruleTester.run('no-unused-modules', rule, {
  valid: [],
  invalid: [
    tInvalid({
      code: 'const m0 = 5; const m = 10; export { m0 as m1, m }; export default () => {}',
      filename: testFilePath('./no-unused-modules/file-m.js'),
      options: unusedExportsOptions,
      errors: [
        createUnusedError('m1'),
        createUnusedError('m'),
        createUnusedError('default'),
      ],
    }),
  ],
})
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `import * as m from '${testFilePath(
        './no-unused-modules/file-m.js',
      )}'; import unknown from 'unknown-module'`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
    }),
    tValid({
      code: 'const m0 = 5; const m = 10; export { m0 as m1, m }; export default () => {}',
      filename: testFilePath('./no-unused-modules/file-m.js'),
      options: unusedExportsOptions,
    }),
  ],
  invalid: [],
})

// remove all exports
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `/* import * as m from '${testFilePath(
        './no-unused-modules/file-m.js',
      )}' */`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
    }),
  ],
  invalid: [
    tInvalid({
      code: 'const m0 = 5; const m = 10; export { m0 as m1, m }; export default () => {}',
      filename: testFilePath('./no-unused-modules/file-m.js'),
      options: unusedExportsOptions,
      errors: [
        createUnusedError('m1'),
        createUnusedError('m'),
        createUnusedError('default'),
      ],
    }),
  ],
})

ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `export * from '${testFilePath('./no-unused-modules/file-m.js')}';`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
    }),
  ],
  invalid: [],
})
ruleTester.run('no-unused-modules', rule, {
  valid: [],
  invalid: [
    tInvalid({
      code: 'const m0 = 5; const m = 10; export { m0 as m1, m }; export default () => {}',
      filename: testFilePath('./no-unused-modules/file-m.js'),
      options: unusedExportsOptions,
      errors: [createUnusedError('default')],
    }),
  ],
})

ruleTester.run('no-unused-modules', rule, {
  valid: [],
  invalid: [
    tInvalid({
      code: `export { m1, m} from '${testFilePath(
        './no-unused-modules/file-m.js',
      )}';`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
      errors: [createUnusedError('m1'), createUnusedError('m')],
    }),
    tInvalid({
      code: 'const m0 = 5; const m = 10; export { m0 as m1, m }; export default () => {}',
      filename: testFilePath('./no-unused-modules/file-m.js'),
      options: unusedExportsOptions,
      errors: [createUnusedError('default')],
    }),
  ],
})

ruleTester.run('no-unused-modules', rule, {
  valid: [
    /* TODO:
    test({
      options: unusedExportsOptions,
      code: `export { default, m1 } from '${testFilePath('./no-unused-modules/file-m.js')}';`,
      filename: testFilePath('./no-unused-modules/file-0.js')
    }),
    */
  ],
  invalid: [
    tInvalid({
      code: `export { default, m1 } from '${testFilePath(
        './no-unused-modules/file-m.js',
      )}';`,
      filename: testFilePath('./no-unused-modules/file-0.js'),
      options: unusedExportsOptions,
      errors: [createUnusedError('default'), createUnusedError('m1')],
    }),
    tInvalid({
      code: 'const m0 = 5; const m = 10; export { m0 as m1, m }; export default () => {}',
      filename: testFilePath('./no-unused-modules/file-m.js'),
      options: unusedExportsOptions,
      errors: [createUnusedError('m')],
    }),
  ],
})

// Test that import and export in the same file both counts as usage
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `export const a = 5;export const b = 't1'`,
      filename: testFilePath('./no-unused-modules/import-export-1.js'),
      options: unusedExportsOptions,
    }),
  ],
  invalid: [],
})

describe('renameDefault', () => {
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export { default as Component } from "./Component"',
        filename: testFilePath(
          './no-unused-modules/renameDefault/components.js',
        ),
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'export default function Component() {}',
        filename: testFilePath(
          './no-unused-modules/renameDefault/Component.js',
        ),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export { default as ComponentA } from "./ComponentA";export { default as ComponentB } from "./ComponentB";',
        filename: testFilePath(
          './no-unused-modules/renameDefault-2/components.js',
        ),
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'export default function ComponentA() {};',
        filename: testFilePath(
          './no-unused-modules/renameDefault-2/ComponentA.js',
        ),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
})

describe('test behavior for new file', () => {
  beforeAll(() => {
    fs.writeFileSync(testFilePath('./no-unused-modules/file-added-0.js'), '', {
      encoding: 'utf8',
      flag: 'w',
    })
  })

  // add import in newly created file
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `import * as m from '${testFilePath(
          './no-unused-modules/file-m.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-added-0.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'const m0 = 5; const m = 10; export { m0 as m1, m }; export default () => {}',
        filename: testFilePath('./no-unused-modules/file-m.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })

  // add export for newly created file
  ruleTester.run('no-unused-modules', rule, {
    valid: [],
    invalid: [
      tInvalid({
        code: `export default () => {2}`,
        filename: testFilePath('./no-unused-modules/file-added-0.js'),
        options: unusedExportsOptions,
        errors: [createUnusedError('default')],
      }),
    ],
  })

  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `import def from '${testFilePath(
          './no-unused-modules/file-added-0.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-0.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `export default () => {}`,
        filename: testFilePath('./no-unused-modules/file-added-0.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })

  // export * only considers named imports. default imports still need to be reported
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `export * from '${testFilePath(
          './no-unused-modules/file-added-0.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-0.js'),
        options: unusedExportsOptions,
      }),
      // Test export * from 'external-compiled-library'
      tValid({
        code: `export * from 'external-compiled-library'`,
        filename: testFilePath('./no-unused-modules/file-r.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [
      tInvalid({
        code: `export const z = 'z';export default () => {}`,
        filename: testFilePath('./no-unused-modules/file-added-0.js'),
        options: unusedExportsOptions,
        errors: [createUnusedError('default')],
      }),
    ],
  })
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `export const a = 2`,
        filename: testFilePath('./no-unused-modules/file-added-0.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })

  // remove export *. all exports need to be reported
  ruleTester.run('no-unused-modules', rule, {
    valid: [],
    invalid: [
      tInvalid({
        code: `export { a } from '${testFilePath(
          './no-unused-modules/file-added-0.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-0.js'),
        options: unusedExportsOptions,
        errors: [createUnusedError('a')],
      }),
      tInvalid({
        code: `export const z = 'z';export default () => {}`,
        filename: testFilePath('./no-unused-modules/file-added-0.js'),
        options: unusedExportsOptions,
        errors: [createUnusedError('z'), createUnusedError('default')],
      }),
    ],
  })

  describe('test behavior for new file', () => {
    beforeAll(() => {
      fs.writeFileSync(
        testFilePath('./no-unused-modules/file-added-1.js'),
        '',
        { encoding: 'utf8', flag: 'w' },
      )
    })

    ruleTester.run('no-unused-modules', rule, {
      valid: [
        tValid({
          code: `export * from '${testFilePath(
            './no-unused-modules/file-added-1.js',
          )}'`,
          filename: testFilePath('./no-unused-modules/file-0.js'),
          options: unusedExportsOptions,
        }),
      ],
      invalid: [
        tInvalid({
          code: `export const z = 'z';export default () => {}`,
          filename: testFilePath('./no-unused-modules/file-added-1.js'),
          options: unusedExportsOptions,
          errors: [createUnusedError('default')],
        }),
      ],
    })
    afterAll(() => {
      if (fs.existsSync(testFilePath('./no-unused-modules/file-added-1.js'))) {
        fs.unlinkSync(testFilePath('./no-unused-modules/file-added-1.js'))
      }
    })
  })

  afterAll(() => {
    if (fs.existsSync(testFilePath('./no-unused-modules/file-added-0.js'))) {
      fs.unlinkSync(testFilePath('./no-unused-modules/file-added-0.js'))
    }
  })
})

describe('test behavior for new file', () => {
  beforeAll(() => {
    fs.writeFileSync(testFilePath('./no-unused-modules/file-added-2.js'), '', {
      encoding: 'utf8',
      flag: 'w',
    })
  })
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `import added from '${testFilePath(
          './no-unused-modules/file-added-2.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-added-1.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `export default () => {}`,
        filename: testFilePath('./no-unused-modules/file-added-2.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
  afterAll(() => {
    if (fs.existsSync(testFilePath('./no-unused-modules/file-added-2.js'))) {
      fs.unlinkSync(testFilePath('./no-unused-modules/file-added-2.js'))
    }
  })
})

describe('test behavior for new file', () => {
  beforeAll(() => {
    fs.writeFileSync(testFilePath('./no-unused-modules/file-added-3.js'), '', {
      encoding: 'utf8',
      flag: 'w',
    })
  })
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `import { added } from '${testFilePath(
          './no-unused-modules/file-added-3.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-added-1.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `export const added = () => {}`,
        filename: testFilePath('./no-unused-modules/file-added-3.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
  afterAll(() => {
    if (fs.existsSync(testFilePath('./no-unused-modules/file-added-3.js'))) {
      fs.unlinkSync(testFilePath('./no-unused-modules/file-added-3.js'))
    }
  })
})

describe('test behavior for destructured exports', () => {
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `import { destructured } from '${testFilePath(
          './no-unused-modules/file-destructured-1.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-destructured-2.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `export const { destructured } = {};`,
        filename: testFilePath('./no-unused-modules/file-destructured-1.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [
      tInvalid({
        code: `export const { destructured2 } = {};`,
        filename: testFilePath('./no-unused-modules/file-destructured-1.js'),
        options: unusedExportsOptions,
        errors: [createUnusedError('destructured2')],
      }),
    ],
  })
})

describe('test behavior for new file', () => {
  beforeAll(() => {
    fs.writeFileSync(
      testFilePath('./no-unused-modules/file-added-4.js.js'),
      '',
      { encoding: 'utf8', flag: 'w' },
    )
  })
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `import * as added from '${testFilePath(
          './no-unused-modules/file-added-4.js.js',
        )}'`,
        filename: testFilePath('./no-unused-modules/file-added-1.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `export const added = () => {}; export default () => {}`,
        filename: testFilePath('./no-unused-modules/file-added-4.js.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
  afterAll(() => {
    if (fs.existsSync(testFilePath('./no-unused-modules/file-added-4.js.js'))) {
      fs.unlinkSync(testFilePath('./no-unused-modules/file-added-4.js.js'))
    }
  })
})

describe('do not report missing export for ignored file', () => {
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export const test = true',
        filename: testFilePath('./no-unused-modules/file-ignored-a.js'),
        options: [
          {
            src: [testFilePath('./no-unused-modules/**/*.js')],
            ignoreExports: [testFilePath('./no-unused-modules/*ignored*.js')],
            missingExports: true,
          },
        ],
      }),
    ],
    invalid: [],
  })
})

// lint file not available in `src`
ruleTester.run('no-unused-modules', rule, {
  valid: [
    tValid({
      code: `export const jsxFoo = 'foo'; export const jsxBar = 'bar'`,
      filename: testFilePath('../jsx/named.jsx'),
      options: unusedExportsOptions,
    }),
  ],
  invalid: [],
})

describe('do not report unused export for files mentioned in package.json', () => {
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export const bin = "bin"',
        filename: testFilePath('./no-unused-modules/bin.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'export const binObject = "binObject"',
        filename: testFilePath('./no-unused-modules/binObject/index.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'export const browser = "browser"',
        filename: testFilePath('./no-unused-modules/browser.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'export const browserObject = "browserObject"',
        filename: testFilePath('./no-unused-modules/browserObject/index.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'export const main = "main"',
        filename: testFilePath('./no-unused-modules/main/index.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [
      tInvalid({
        code: 'export const privatePkg = "privatePkg"',
        filename: testFilePath('./no-unused-modules/privatePkg/index.js'),
        options: unusedExportsOptions,
        errors: [createUnusedError('privatePkg')],
      }),
    ],
  })
})

describe('Avoid errors if re-export all from umd compiled library', () => {
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `export * from '${testFilePath('./no-unused-modules/bin.js')}'`,
        filename: testFilePath('./no-unused-modules/main/index.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
})

describe('TypeScript', () => {
  typescriptRuleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: `
        import {b} from './file-ts-b';
        import {c} from './file-ts-c';
        import {d} from './file-ts-d';
        import {e} from './file-ts-e';

        const a = b + 1 + e.f;
        const a2: c = {};
        const a3: d = {};
        `,
        filename: testFilePath('./no-unused-modules/typescript/file-ts-a.ts'),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export const b = 2;`,
        filename: testFilePath('./no-unused-modules/typescript/file-ts-b.ts'),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export interface c {};`,
        filename: testFilePath('./no-unused-modules/typescript/file-ts-c.ts'),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export type d = {};`,
        filename: testFilePath('./no-unused-modules/typescript/file-ts-d.ts'),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export enum e { f };`,
        options: unusedExportsTypescriptOptions,
        filename: testFilePath('./no-unused-modules/typescript/file-ts-e.ts'),
      }),
      tValid({
        code: `
        import type {b} from './file-ts-b-used-as-type';
        import type {c} from './file-ts-c-used-as-type';
        import type {d} from './file-ts-d-used-as-type';
        import type {e} from './file-ts-e-used-as-type';

        const a: typeof b = 2;
        const a2: c = {};
        const a3: d = {};
        const a4: typeof e = undefined;
        `,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-a-import-type.ts',
        ),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export const b = 2;`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-b-used-as-type.ts',
        ),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export interface c {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-c-used-as-type.ts',
        ),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export type d = {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-d-used-as-type.ts',
        ),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export enum e { f };`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-e-used-as-type.ts',
        ),
        options: unusedExportsTypescriptOptions,
      }),
      // Should also be valid when the exporting files are linted before the importing ones
      tValid({
        code: `export interface g {}`,
        filename: testFilePath('./no-unused-modules/typescript/file-ts-g.ts'),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `import {g} from './file-ts-g';`,
        filename: testFilePath('./no-unused-modules/typescript/file-ts-f.ts'),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `export interface g {}; /* used-as-type */`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-g-used-as-type.ts',
        ),
        options: unusedExportsTypescriptOptions,
      }),
      tValid({
        code: `import type {g} from './file-ts-g';`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-f-import-type.ts',
        ),
        options: unusedExportsTypescriptOptions,
      }),
    ],
    invalid: [
      tInvalid({
        code: `export const b = 2;`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-b-unused.ts',
        ),
        options: unusedExportsTypescriptOptions,
        errors: [createUnusedError('b')],
      }),
      tInvalid({
        code: `export interface c {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-c-unused.ts',
        ),
        options: unusedExportsTypescriptOptions,
        errors: [createUnusedError('c')],
      }),
      tInvalid({
        code: `export type d = {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-d-unused.ts',
        ),
        options: unusedExportsTypescriptOptions,
        errors: [createUnusedError('d')],
      }),
      tInvalid({
        code: `export enum e { f };`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-e-unused.ts',
        ),
        options: unusedExportsTypescriptOptions,
        errors: [createUnusedError('e')],
      }),
    ],
  })
})

describe('ignoreUnusedTypeExports', () => {
  typescriptRuleTester.run('no-unused-modules', rule, {
    valid: [
      // unused vars should not report
      tValid({
        code: `export interface c {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-c-unused.ts',
        ),
        options: unusedExportsTypescriptIgnoreUnusedTypesOptions,
      }),
      tValid({
        code: `export type d = {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-d-unused.ts',
        ),
        options: unusedExportsTypescriptIgnoreUnusedTypesOptions,
      }),
      tValid({
        code: `export enum e { f };`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-e-unused.ts',
        ),
        options: unusedExportsTypescriptIgnoreUnusedTypesOptions,
      }),
      // used vars should not report
      tValid({
        code: `export interface c {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-c-used-as-type.ts',
        ),
        options: unusedExportsTypescriptIgnoreUnusedTypesOptions,
      }),
      tValid({
        code: `export type d = {};`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-d-used-as-type.ts',
        ),
        options: unusedExportsTypescriptIgnoreUnusedTypesOptions,
      }),
      tValid({
        code: `export enum e { f };`,
        filename: testFilePath(
          './no-unused-modules/typescript/file-ts-e-used-as-type.ts',
        ),
        options: unusedExportsTypescriptIgnoreUnusedTypesOptions,
      }),
    ],
    invalid: [],
  })
})

describe('correctly work with JSX only files', () => {
  jsxRuleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'import a from "file-jsx-a";',
        filename: testFilePath('./no-unused-modules/jsx/file-jsx-a.jsx'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsJsxOptions,
      }),
    ],
    invalid: [
      tInvalid({
        code: `export const b = 2;`,
        filename: testFilePath('./no-unused-modules/jsx/file-jsx-b.jsx'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsJsxOptions,
        errors: [createUnusedError('b')],
      }),
    ],
  })
})

describe('ignore flow types', () => {
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'import { type FooType, type FooInterface } from "./flow-2";',
        filename: testFilePath('./no-unused-modules/flow/flow-0.js'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsOptions,
      }),
      tValid({
        code: `// @flow strict
        export type FooType = string;
        export interface FooInterface {};
        `,
        filename: testFilePath('./no-unused-modules/flow/flow-2.js'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'import type { FooType, FooInterface } from "./flow-4";',
        filename: testFilePath('./no-unused-modules/flow/flow-3.js'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsOptions,
      }),
      tValid({
        code: `// @flow strict
        export type FooType = string;
        export interface FooInterface {};
        `,
        filename: testFilePath('./no-unused-modules/flow/flow-4.js'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsOptions,
      }),
      tValid({
        code: `// @flow strict
        export type Bar = number;
        export interface BarInterface {};
        `,
        filename: testFilePath('./no-unused-modules/flow/flow-1.js'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
})

describe('support (nested) destructuring assignment', () => {
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'import {a, b} from "./destructuring-b";',
        filename: testFilePath('./no-unused-modules/destructuring-a.js'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'const obj = {a: 1, dummy: {b: 2}}; export const {a, dummy: {b}} = obj;',
        filename: testFilePath('./no-unused-modules/destructuring-b.js'),
        languageOptions: { parser: require(parsers.BABEL) },
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
})

describe('support ES2022 Arbitrary module namespace identifier names', () => {
  ruleTester.run('no-unused-module', rule, {
    valid: [
      tValid({
        code: `import { "foo" as foo } from "./arbitrary-module-namespace-identifier-name-a"`,
        filename: testFilePath(
          './no-unused-modules/arbitrary-module-namespace-identifier-name-b.js',
        ),
        languageOptions: {
          parser: require(parsers.ESPREE),
          parserOptions: { ecmaVersion: 2022 },
        },
        options: unusedExportsOptions,
      }),
      tValid({
        code: 'const foo = 333;\nexport { foo as "foo" }',
        filename: testFilePath(
          './no-unused-modules/arbitrary-module-namespace-identifier-name-a.js',
        ),
        languageOptions: {
          parser: require(parsers.ESPREE),
          parserOptions: { ecmaVersion: 2022 },
        },
        options: unusedExportsOptions,
      }),
    ],
    invalid: [
      tInvalid({
        code: 'const foo = 333\nexport { foo as "foo" }',
        filename: testFilePath(
          './no-unused-modules/arbitrary-module-namespace-identifier-name-c.js',
        ),
        languageOptions: {
          parser: require(parsers.BABEL),
          parserOptions: { ecmaVersion: 2022 },
        },
        options: unusedExportsOptions,
        errors: [createUnusedError('foo')],
      }),
    ],
  })
})

describe('parser ignores prefixes like BOM and hashbang', () => {
  // bom, hashbang
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export const foo = 1;\n',
        filename: testFilePath('./no-unused-modules/prefix-child.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `\uFEFF#!/usr/bin/env node\nimport {foo} from './prefix-child.js';\n`,
        filename: testFilePath('./no-unused-modules/prefix-parent-bom.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
  // no bom, hashbang
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export const foo = 1;\n',
        filename: testFilePath('./no-unused-modules/prefix-child.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `#!/usr/bin/env node\nimport {foo} from './prefix-child.js';\n`,
        filename: testFilePath('./no-unused-modules/prefix-parent-hashbang.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
  // bom, no hashbang
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export const foo = 1;\n',
        filename: testFilePath('./no-unused-modules/prefix-child.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `\uFEFF#!/usr/bin/env node\nimport {foo} from './prefix-child.js';\n`,
        filename: testFilePath(
          './no-unused-modules/prefix-parent-bomhashbang.js',
        ),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
  // no bom, no hashbang
  ruleTester.run('no-unused-modules', rule, {
    valid: [
      tValid({
        code: 'export const foo = 1;\n',
        filename: testFilePath('./no-unused-modules/prefix-child.js'),
        options: unusedExportsOptions,
      }),
      tValid({
        code: `import {foo} from './prefix-child.js';\n`,
        filename: testFilePath('./no-unused-modules/prefix-parent.js'),
        options: unusedExportsOptions,
      }),
    ],
    invalid: [],
  })
})

// [ESLint8_56_FlatRuleTester, ESLint9_FlatRuleTester]
for (const [name, FlatRuleTester] of [
  [
    'eslint 8.56 flat',
    // @ts-expect-error -- incorrect types
    eslint8UnsupportedApi.FlatRuleTester,
  ],
  ['eslint 9 flat', ESLint9_FlatRuleTester],
] as const) {
  describe('supports ' + name, () => {
    const flatRuleTester = new FlatRuleTester() as TSESLint.RuleTester
    flatRuleTester.run('no-unused-modules', rule, {
      valid: [
        {
          options: unusedExportsOptions,
          code: 'import { o2 } from "./file-o"; export default () => 12',
          filename: testFilePath('./no-unused-modules/file-a.js'),
        },
      ],
      invalid: [
        {
          options: unusedExportsOptions,
          code: 'export default () => 13',
          filename: testFilePath('./no-unused-modules/file-f.js'),
          errors: [
            {
              messageId: 'unused',
              data: {
                value: 'default',
              },
            },
          ],
        },
      ],
    })
  })
}
