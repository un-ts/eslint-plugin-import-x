import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, testFilePath } from '../utils'
import type { GetRuleModuleMessageIds } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-internal-modules'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createNotAllowedError(
  importPath: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return {
    messageId: 'noAllowed',
    data: { importPath },
  }
}

ruleTester.run('no-internal-modules', rule, {
  valid: [
    // imports
    tValid({
      code: 'import a from "./plugin2"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [],
    }),
    tValid({
      code: 'const a = require("./plugin2")',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
    }),
    tValid({
      code: 'const a = require("./plugin2/")',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
    }),
    tValid({
      code: 'const dynamic = "./plugin2/"; const a = require(dynamic)',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
    }),
    tValid({
      code: 'import b from "./internal.js"',
      filename: testFilePath('./internal-modules/plugins/plugin2/index.js'),
    }),
    tValid({
      code: 'import get from "lodash.get"',
      filename: testFilePath('./internal-modules/plugins/plugin2/index.js'),
    }),
    tValid({
      code: 'import b from "@org/package"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
    }),
    tValid({
      code: 'import b from "../../api/service"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [
        {
          allow: ['**/api/*'],
        },
      ],
    }),
    tValid({
      code: 'import "jquery/dist/jquery"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [
        {
          allow: ['jquery/dist/*'],
        },
      ],
    }),
    tValid({
      code: 'import "./app/index.js";\nimport "./app/index"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [
        {
          allow: ['**/index{.js,}'],
        },
      ],
    }),
    tValid({
      code: 'import a from "./plugin2/thing"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [
        {
          forbid: ['**/api/*'],
        },
      ],
    }),
    tValid({
      code: 'const a = require("./plugin2/thing")',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [
        {
          forbid: ['**/api/*'],
        },
      ],
    }),
    tValid({
      code: 'import b from "@org/package"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [
        {
          forbid: ['@org/package/*'],
        },
      ],
    }),
    // exports
    tValid({
      code: 'export {a} from "./internal.js"',
      filename: testFilePath('./internal-modules/plugins/plugin2/index.js'),
    }),
    tValid({
      code: 'export * from "lodash.get"',
      filename: testFilePath('./internal-modules/plugins/plugin2/index.js'),
    }),
    tValid({
      code: 'export {b} from "@org/package"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
    }),
    tValid({
      code: 'export {b} from "../../api/service"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [
        {
          allow: ['**/api/*'],
        },
      ],
    }),
    tValid({
      code: 'export * from "jquery/dist/jquery"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [
        {
          allow: ['jquery/dist/*'],
        },
      ],
    }),
    tValid({
      code: 'export * from "./app/index.js";\nexport * from "./app/index"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [
        {
          allow: ['**/index{.js,}'],
        },
      ],
    }),
    tValid({
      code: `
        export class AuthHelper {

          static checkAuth(auth) {
          }
        }
      `,
    }),
    tValid({
      code: `
        export class AuthHelper {

          public static checkAuth(auth?: string): boolean {
          }
        }
      `,
    }),
    tValid({
      code: 'export * from "./plugin2/thing"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [{ forbid: ['**/api/*'] }],
    }),
    tValid({
      code: 'export { b } from "@org/package"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['@org/package/*'] }],
    }),
    tValid({
      code: 'export * from "./app/index.js";\nexport * from "./app/index"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['**/index.ts'] }],
    }),
  ],

  invalid: [
    // imports
    tInvalid({
      code: 'import "./plugin2/index.js";\nimport "./plugin2/app/index"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [{ allow: ['*/index.js'] }],
      errors: [
        {
          ...createNotAllowedError('./plugin2/app/index'),
          line: 2,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "app/a"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['app/**/**'] }],
      errors: [
        {
          ...createNotAllowedError('app/a'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import "./app/index.js"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      errors: [
        {
          ...createNotAllowedError('./app/index.js'),
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "./plugin2/internal"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      errors: [
        {
          ...createNotAllowedError('./plugin2/internal'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import a from "../api/service/index"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [
        {
          allow: ['**/internal-modules/*'],
        },
      ],
      errors: [
        {
          ...createNotAllowedError('../api/service/index'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "@org/package/internal"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      errors: [
        {
          ...createNotAllowedError('@org/package/internal'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import get from "debug/src/node"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      errors: [
        {
          ...createNotAllowedError('debug/src/node'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'import "./app/index.js"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['**/app/*'] }],
      errors: [
        {
          ...createNotAllowedError('./app/index.js'),
          line: 1,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "@org/package"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['@org/**'] }],
      errors: [
        {
          ...createNotAllowedError('@org/package'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "app/a/b"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['app/**/**'] }],
      errors: [
        {
          ...createNotAllowedError('app/a/b'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import get from "lodash.get"',
      filename: testFilePath('./internal-modules/plugins/plugin2/index.js'),
      options: [{ forbid: ['lodash.*'] }],
      errors: [
        {
          ...createNotAllowedError('lodash.get'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'import "./app/index.js";\nimport "./app/index"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['**/index{.js,}'] }],
      errors: [
        {
          ...createNotAllowedError('./app/index.js'),
          line: 1,
          column: 8,
        },
        {
          ...createNotAllowedError('./app/index'),
          line: 2,
          column: 8,
        },
      ],
    }),
    tInvalid({
      code: 'import "@/api/service";',
      options: [{ forbid: ['**/api/*'] }],
      errors: [
        {
          ...createNotAllowedError('@/api/service'),
          line: 1,
          column: 8,
        },
      ],
      settings: {
        'import-x/resolver': {
          webpack: {
            config: {
              resolve: {
                alias: {
                  '@': testFilePath('internal-modules'),
                },
              },
            },
          },
        },
      },
    }),
    // exports
    tInvalid({
      code: 'export * from "./plugin2/index.js";\nexport * from "./plugin2/app/index"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [{ allow: ['*/index.js'] }],
      errors: [
        {
          ...createNotAllowedError('./plugin2/app/index'),
          line: 2,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'export * from "app/a"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['app/**/**'] }],
      errors: [
        {
          ...createNotAllowedError('app/a'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'export * from "./app/index.js"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      errors: [
        {
          ...createNotAllowedError('./app/index.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'export {b} from "./plugin2/internal"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      errors: [
        {
          ...createNotAllowedError('./plugin2/internal'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'export {a} from "../api/service/index"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [{ allow: ['**/internal-modules/*'] }],
      errors: [
        {
          ...createNotAllowedError('../api/service/index'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'export {b} from "@org/package/internal"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      errors: [
        {
          ...createNotAllowedError('@org/package/internal'),
          line: 1,
          column: 17,
        },
      ],
    }),
    tInvalid({
      code: 'export {get} from "debug/src/node"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      errors: [
        {
          ...createNotAllowedError('debug/src/node'),
          line: 1,
          column: 19,
        },
      ],
    }),
    tInvalid({
      code: 'export * from "./plugin2/thing"',
      filename: testFilePath('./internal-modules/plugins/plugin.js'),
      options: [{ forbid: ['**/plugin2/*'] }],
      errors: [
        {
          ...createNotAllowedError('./plugin2/thing'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'export * from "app/a"',
      filename: testFilePath('./internal-modules/plugins/plugin2/internal.js'),
      options: [{ forbid: ['**'] }],
      errors: [
        {
          ...createNotAllowedError('app/a'),
          line: 1,
          column: 15,
        },
      ],
    }),
  ],
})
