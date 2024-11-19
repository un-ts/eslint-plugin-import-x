import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, parsers, testFilePath } from '../utils'
import type { GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-cycle'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>({
  filename: testFilePath('./cycles/depth-zero.js'),
})

const createCycleSourceError = (
  source: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> => ({
  messageId: 'cycleSource',
  data: { source },
})

ruleTester.run('no-cycle', rule, {
  valid: [
    // this rule doesn't care if the cycle length is 0
    tValid({ code: 'import foo from "./foo.js"' }),

    tValid({ code: 'import _ from "lodash"' }),
    tValid({ code: 'import foo from "@scope/foo"' }),
    tValid({ code: 'var _ = require("lodash")' }),
    tValid({ code: 'var find = require("lodash.find")' }),
    tValid({ code: 'var foo = require("./foo")' }),
    tValid({ code: 'var foo = require("../foo")' }),
    tValid({ code: 'var foo = require("foo")' }),
    tValid({ code: 'var foo = require("./")' }),
    tValid({ code: 'var foo = require("@scope/foo")' }),
    tValid({ code: 'var bar = require("./bar/index")' }),
    tValid({ code: 'var bar = require("./bar")' }),
    tValid({
      code: 'import { foo } from "cycles/external/depth-one"',
      options: [{ ignoreExternal: true }],
      settings: {
        'import-x/resolver': 'webpack',
        'import-x/external-module-folders': ['cycles/external'],
      },
    }),
    tValid({
      code: 'import { foo } from "./external-depth-two"',
      options: [{ ignoreExternal: true }],
      settings: {
        'import-x/resolver': 'webpack',
        'import-x/external-module-folders': ['cycles/external'],
      },
    }),

    tValid({
      code: `import { foo } from "./es6/depth-two"`,
      options: [{ maxDepth: 1 }],
    }),
    tValid({
      code: `import { foo, bar } from "./es6/depth-two"`,
      options: [{ maxDepth: 1 }],
    }),
    tValid({
      code: `import("./es6/depth-two").then(function({ foo }) {})`,
      options: [{ maxDepth: 1 }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `import type { FooType } from "./es6/depth-one"`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `import type { FooType, BarType } from "./es6/depth-one"`,
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `function bar(){ return import("./es6/depth-one"); } // #2265 1`,
      options: [{ allowUnsafeDynamicCyclicDependency: true }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `import { foo } from "./es6/depth-one-dynamic"; // #2265 2`,
      options: [{ allowUnsafeDynamicCyclicDependency: true }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: `function bar(){ return import("./es6/depth-one"); } // #2265 3`,
      options: [{ allowUnsafeDynamicCyclicDependency: true }],
    }),
    tValid({
      code: `import { foo } from "./es6/depth-one-dynamic"; // #2265 4`,
      options: [{ allowUnsafeDynamicCyclicDependency: true }],
    }),

    tValid({
      code: 'import { bar } from "./flow-types"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { bar } from "./flow-types-only-importing-type"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { bar } from "./flow-types-only-importing-multiple-types"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tValid({
      code: 'import { bar } from "./flow-typeof"',
      languageOptions: { parser: require(parsers.BABEL) },
    }),
  ],

  invalid: [
    tInvalid({
      code: 'import { bar } from "./flow-types-some-type-imports"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [{ messageId: 'cycle' }],
    }),
    tInvalid({
      code: 'import { foo } from "cycles/external/depth-one"',
      errors: [{ messageId: 'cycle' }],
      settings: {
        'import-x/resolver': 'webpack',
        'import-x/external-module-folders': ['cycles/external'],
      },
    }),
    tInvalid({
      code: 'import { foo } from "./external-depth-two"',
      errors: [createCycleSourceError('cycles/external/depth-one:1')],
      settings: {
        'import-x/resolver': 'webpack',
        'import-x/external-module-folders': ['cycles/external'],
      },
    }),

    // Ensure behavior does not change for those tests, with or without
    ...[{}, { allowUnsafeDynamicCyclicDependency: true }].flatMap(opts => [
      tInvalid({
        code: `import { foo } from "./es6/depth-one"`,
        options: [{ ...opts }],
        errors: [{ messageId: 'cycle' }],
      }),
      tInvalid({
        code: `import { foo } from "./es6/depth-one"`,
        options: [{ ...opts, maxDepth: 1 }],
        errors: [{ messageId: 'cycle' }],
      }),
      tInvalid({
        code: `const { foo } = require("./es6/depth-one")`,
        options: [{ ...opts, commonjs: true }],
        errors: [{ messageId: 'cycle' }],
      }),
      tInvalid({
        code: `require(["./es6/depth-one"], d1 => {})`,
        options: [{ ...opts, amd: true }],
        errors: [{ messageId: 'cycle' }],
      }),
      tInvalid({
        code: `define(["./es6/depth-one"], d1 => {})`,
        options: [{ ...opts, amd: true }],
        errors: [{ messageId: 'cycle' }],
      }),
      tInvalid({
        code: `import { foo } from "./es6/depth-one-reexport"`,
        options: [{ ...opts }],
        errors: [{ messageId: 'cycle' }],
      }),
      tInvalid({
        code: `import { foo } from "./es6/depth-two"`,
        options: [{ ...opts }],
        errors: [createCycleSourceError('./depth-one:1')],
      }),
      tInvalid({
        code: `import { foo } from "./es6/depth-two"`,
        options: [{ ...opts, maxDepth: 2 }],
        errors: [createCycleSourceError('./depth-one:1')],
      }),
      tInvalid({
        code: `const { foo } = require("./es6/depth-two")`,
        errors: [createCycleSourceError('./depth-one:1')],
        options: [{ ...opts, commonjs: true }],
      }),
      tInvalid({
        code: `import { two } from "./es6/depth-three-star"`,
        options: [{ ...opts }],
        errors: [createCycleSourceError('./depth-two:1=>./depth-one:1')],
      }),
      tInvalid({
        code: `import one, { two, three } from "./es6/depth-three-star"`,
        options: [{ ...opts }],
        errors: [createCycleSourceError('./depth-two:1=>./depth-one:1')],
      }),
      tInvalid({
        code: `import { bar } from "./es6/depth-three-indirect"`,
        options: [{ ...opts }],
        errors: [createCycleSourceError('./depth-two:1=>./depth-one:1')],
      }),
      tInvalid({
        code: `import { bar } from "./es6/depth-three-indirect"`,
        options: [{ ...opts }],
        errors: [createCycleSourceError('./depth-two:1=>./depth-one:1')],
        languageOptions: { parser: require(parsers.BABEL) },
      }),
      tInvalid({
        code: `import { foo } from "./es6/depth-two"`,
        options: [{ ...opts, maxDepth: Number.POSITIVE_INFINITY }],
        errors: [createCycleSourceError('./depth-one:1')],
      }),
      tInvalid({
        code: `import { foo } from "./es6/depth-two"`,
        options: [{ ...opts, maxDepth: '∞' }],
        errors: [createCycleSourceError('./depth-one:1')],
      }),
    ]),

    tInvalid({
      code: `import("./es6/depth-three-star")`,
      errors: [createCycleSourceError('./depth-two:1=>./depth-one:1')],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tInvalid({
      code: `import("./es6/depth-three-indirect")`,
      errors: [createCycleSourceError('./depth-two:1=>./depth-one:1')],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tInvalid({
      code: `import("./es6/depth-two")`,
      options: [{ maxDepth: Number.POSITIVE_INFINITY }],
      errors: [createCycleSourceError('./depth-one:1')],
    }),
    tInvalid({
      code: `import("./es6/depth-two")`,
      options: [{ maxDepth: '∞' }],
      errors: [createCycleSourceError('./depth-one:1')],
    }),
    tInvalid({
      code: `function bar(){ return import("./es6/depth-one"); } // #2265 5`,
      errors: [{ messageId: 'cycle' }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tInvalid({
      // Dynamic import is not properly caracterized with eslint < 4
      code: `import { foo } from "./es6/depth-one-dynamic"; // #2265 6`,
      errors: [{ messageId: 'cycle' }],
      languageOptions: { parser: require(parsers.BABEL) },
    }),
    tInvalid({
      code: `function bar(){ return import("./es6/depth-one"); } // #2265 7`,
      errors: [{ messageId: 'cycle' }],
    }),
    tInvalid({
      code: `import { foo } from "./es6/depth-one-dynamic"; // #2265 8`,
      errors: [{ messageId: 'cycle' }],
    }),

    tInvalid({
      code: 'import { bar } from "./flow-types-depth-one"',
      languageOptions: { parser: require(parsers.BABEL) },
      errors: [
        createCycleSourceError('./flow-types-depth-two:4=>./es6/depth-one:1'),
      ],
    }),
    tInvalid({
      code: 'import { foo } from "./intermediate-ignore"',
      errors: [{ ...createCycleSourceError('./ignore:1'), line: 1 }],
    }),
    tInvalid({
      code: 'import { foo } from "./ignore"',
      errors: [{ messageId: 'cycle', line: 1 }],
    }),
  ],
})
