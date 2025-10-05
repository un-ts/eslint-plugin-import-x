import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'

import { parsers, createRuleTestCaseFunctions, testFilePath } from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-restricted-paths'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createZoneError(
  importPath: string,
  extra: string = '',
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'zone', data: { importPath, extra } }
}

ruleTester.run('no-restricted-paths', rule, {
  valid: [
    tValid({
      code: 'import a from "../client/a.js"',
      filename: testFilePath('./restricted-paths/server/b.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server',
              from: './test/fixtures/restricted-paths/other',
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import a from "../client/a.js"',
      filename: testFilePath('./restricted-paths/server/b.js'),
      options: [
        {
          zones: [
            {
              target: '**/*',
              from: './test/fixtures/restricted-paths/other',
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import a from "../client/a.js"',
      filename: testFilePath('./restricted-paths/client/b.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/!(client)/**/*',
              from: './test/fixtures/restricted-paths/client/**/*',
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'const a = require("../client/a.js")',
      filename: testFilePath('./restricted-paths/server/b.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server',
              from: './test/fixtures/restricted-paths/other',
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import b from "../server/b.js"',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: './test/fixtures/restricted-paths/other',
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import a from "./a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server/one',
              from: './test/fixtures/restricted-paths/server',
              except: ['./one'],
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import a from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server/one',
              from: './test/fixtures/restricted-paths/server',
              except: ['./two'],
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import a from "../one/a.js"',
      filename: testFilePath('./restricted-paths/server/two-new/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server/two',
              from: './test/fixtures/restricted-paths/server',
              except: [],
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import A from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: '**/*',
              from: './test/fixtures/restricted-paths/server/**/*',
              except: ['**/a.js'],
            },
          ],
        },
      ],
    }),

    // support of arrays for from and target
    // array with single element
    tValid({
      code: 'import a from "../client/a.js"',
      filename: testFilePath('./restricted-paths/server/b.js'),
      options: [
        {
          zones: [
            {
              target: ['./test/fixtures/restricted-paths/server'],
              from: './test/fixtures/restricted-paths/other',
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import a from "../client/a.js"',
      filename: testFilePath('./restricted-paths/server/b.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server',
              from: ['./test/fixtures/restricted-paths/other'],
            },
          ],
        },
      ],
    }),
    // array with multiple elements
    tValid({
      code: 'import a from "../one/a.js"',
      filename: testFilePath('./restricted-paths/server/two-new/a.js'),
      options: [
        {
          zones: [
            {
              target: [
                './test/fixtures/restricted-paths/server/two',
                './test/fixtures/restricted-paths/server/three',
              ],
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
    }),
    tValid({
      code: 'import a from "../one/a.js"',
      filename: testFilePath('./restricted-paths/server/two-new/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server',
              from: [
                './test/fixtures/restricted-paths/server/two',
                './test/fixtures/restricted-paths/server/three',
              ],
              except: [],
            },
          ],
        },
      ],
    }),
    // array with multiple glob patterns in from
    tValid({
      code: 'import a from "../client/a.js"',
      filename: testFilePath('./restricted-paths/client/b.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/!(client)/**/*',
              from: [
                './test/fixtures/restricted-paths/client/*',
                './test/fixtures/restricted-paths/client/one/*',
              ],
            },
          ],
        },
      ],
    }),
    // array with mix of glob and non glob patterns in target
    tValid({
      code: 'import a from "../client/a.js"',
      filename: testFilePath('./restricted-paths/client/b.js'),
      options: [
        {
          zones: [
            {
              target: [
                './test/fixtures/restricted-paths/!(client)/**/*',
                './test/fixtures/restricted-paths/client/a/',
              ],
              from: './test/fixtures/restricted-paths/client/**/*',
            },
          ],
        },
      ],
    }),

    // irrelevant function calls
    tValid({ code: 'notrequire("../server/b.js")' }),
    tValid({
      code: 'notrequire("../server/b.js")',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
    }),

    // no config
    tValid({ code: 'require("../server/b.js")' }),
    tValid({ code: 'import b from "../server/b.js"' }),

    // builtin (ignore)
    tValid({ code: 'require("os")' }),
  ],

  invalid: [
    tInvalid({
      code: 'import b from "../server/b.js"; // 1',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "../server/b.js"; // 2',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client/**/*',
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    // TODO: fix test on windows
    ...(process.platform === 'win32'
      ? []
      : [
          tInvalid({
            code: 'import b from "../server/b.js";',
            filename: testFilePath('./restricted-paths/client/a.js'),
            options: [
              {
                zones: [
                  {
                    target: './test/fixtures/restricted-paths/client/*.js',
                    from: './test/fixtures/restricted-paths/server',
                  },
                ],
              },
            ],
            errors: [
              {
                ...createZoneError('../server/b.js'),
                line: 1,
                column: 15,
              },
            ],
          }),
        ]),
    tInvalid({
      code: 'import b from "../server/b.js"; // 2 ter',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client/**',
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import a from "../client/a"\nimport c from "./c"',
      filename: testFilePath('./restricted-paths/server/b.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server',
              from: './test/fixtures/restricted-paths/client',
            },
            {
              target: './test/fixtures/restricted-paths/server',
              from: './test/fixtures/restricted-paths/server/c.js',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../client/a'),
          line: 1,
          column: 15,
        },
        {
          ...createZoneError('./c'),
          line: 2,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "../server/b.js"; // 3',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './client',
              from: './server',
            },
          ],
          basePath: testFilePath('./restricted-paths'),
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'const b = require("../server/b.js")',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 19,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server/one',
              from: './test/fixtures/restricted-paths/server',
              except: ['./one'],
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../two/a.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server/one',
              from: './test/fixtures/restricted-paths/server',
              except: ['./one'],
              message: 'Custom message',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../two/a.js', ' Custom message'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/server/one',
              from: './test/fixtures/restricted-paths/server',
              except: ['../client/a'],
            },
          ],
        },
      ],
      errors: [{ messageId: 'path', line: 1, column: 15 }],
    }),
    tInvalid({
      code: 'import A from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: '**/*',
              from: './test/fixtures/restricted-paths/server/**/*',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../two/a.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import A from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: '**/*',
              from: './test/fixtures/restricted-paths/server/**/*',
              except: ['a.js'],
            },
          ],
        },
      ],
      errors: [{ messageId: 'glob', line: 1, column: 15 }],
    }),

    // support of arrays for from and target
    // array with single element
    tInvalid({
      code: 'import b from "../server/b.js"; // 4',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: ['./test/fixtures/restricted-paths/client'],
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "../server/b.js"; // 5',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: ['./test/fixtures/restricted-paths/server'],
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    // array with multiple elements
    tInvalid({
      code: 'import b from "../server/b.js"; // 6',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: [
                './test/fixtures/restricted-paths/client/one',
                './test/fixtures/restricted-paths/client',
              ],
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    tInvalid({
      code: 'import b from "../server/one/b.js"\nimport a from "../server/two/a.js"',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: [
                './test/fixtures/restricted-paths/server/one',
                './test/fixtures/restricted-paths/server/two',
              ],
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/one/b.js'),
          line: 1,
          column: 15,
        },
        {
          ...createZoneError('../server/two/a.js'),
          line: 2,
          column: 15,
        },
      ],
    }),
    // array with multiple glob patterns in from
    tInvalid({
      code: 'import b from "../server/one/b.js"\nimport a from "../server/two/a.js"',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: [
                './test/fixtures/restricted-paths/server/one/*',
                './test/fixtures/restricted-paths/server/two/*',
              ],
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/one/b.js'),
          line: 1,
          column: 15,
        },
        {
          ...createZoneError('../server/two/a.js'),
          line: 2,
          column: 15,
        },
      ],
    }),
    // array with mix of glob and non glob patterns in target
    tInvalid({
      code: 'import b from "../server/b.js"; // 7',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: [
                './test/fixtures/restricted-paths/client/one',
                './test/fixtures/restricted-paths/client/**/*',
              ],
              from: './test/fixtures/restricted-paths/server',
            },
          ],
        },
      ],
      errors: [
        {
          ...createZoneError('../server/b.js'),
          line: 1,
          column: 15,
        },
      ],
    }),
    // configuration format
    tInvalid({
      code: 'import A from "../two/a.js"',
      filename: testFilePath('./restricted-paths/server/one/a.js'),
      options: [
        {
          zones: [
            {
              target: '**/*',
              from: ['./test/fixtures/restricted-paths/server/**/*'],
              except: ['a.js'],
            },
          ],
        },
      ],
      errors: [{ messageId: 'glob', line: 1, column: 15 }],
    }),
    tInvalid({
      code: 'import b from "../server/one/b.js"',
      filename: testFilePath('./restricted-paths/client/a.js'),
      options: [
        {
          zones: [
            {
              target: './test/fixtures/restricted-paths/client',
              from: [
                './test/fixtures/restricted-paths/server/one',
                './test/fixtures/restricted-paths/server/two/*',
              ],
            },
          ],
        },
      ],
      errors: [{ messageId: 'mixedGlob', line: 1, column: 15 }],
    }),
  ],
})

describe('Typescript', () => {
  const settings = {
    'import-x/parsers': { [parsers.TS]: ['.ts'] },
    'import-x/resolver': { 'eslint-import-resolver-typescript': true },
  }
  ruleTester.run('no-restricted-paths', rule, {
    valid: [
      tValid({
        code: 'import type a from "../client/a.ts"',
        filename: testFilePath('./restricted-paths/server/b.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server',
                from: './test/fixtures/restricted-paths/other',
              },
            ],
          },
        ],
      }),
      tValid({
        code: 'import type a from "../client/a.ts"',
        filename: testFilePath('./restricted-paths/server/b.ts'),
        options: [
          {
            zones: [
              {
                target: '**/*',
                from: './test/fixtures/restricted-paths/other',
              },
            ],
          },
        ],

        settings,
      }),
      tValid({
        code: 'import type a from "../client/a.ts"',
        filename: testFilePath('./restricted-paths/client/b.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/!(client)/**/*',
                from: './test/fixtures/restricted-paths/client/**/*',
              },
            ],
          },
        ],
      }),
      tValid({
        code: 'import type b from "../server/b.ts"',
        filename: testFilePath('./restricted-paths/client/a.ts'),
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/client',
                from: './test/fixtures/restricted-paths/other',
              },
            ],
          },
        ],

        settings,
      }),
      tValid({
        code: 'import type a from "./a.ts"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server/one',
                from: './test/fixtures/restricted-paths/server',
                except: ['./one'],
              },
            ],
          },
        ],
      }),
      tValid({
        code: 'import type a from "../two/a.ts"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server/one',
                from: './test/fixtures/restricted-paths/server',
                except: ['./two'],
              },
            ],
          },
        ],
      }),
      tValid({
        code: 'import type a from "../one/a.ts"',
        filename: testFilePath('./restricted-paths/server/two-new/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server/two',
                from: './test/fixtures/restricted-paths/server',
                except: [],
              },
            ],
          },
        ],
      }),
      tValid({
        code: 'import type A from "../two/a.ts"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: '**/*',
                from: './test/fixtures/restricted-paths/server/**/*',
                except: ['**/a.js'],
              },
            ],
          },
        ],
      }),
      // no config
      tValid({
        code: 'import type b from "../server/b.js"',
        settings,
      }),
      tValid({
        code: 'import type * as b from "../server/b.js"',
        settings,
      }),
    ],
    invalid: [
      tInvalid({
        code: 'import type b from "../server/b"',
        filename: testFilePath('./restricted-paths/client/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/client',
                from: './test/fixtures/restricted-paths/server',
              },
            ],
          },
        ],
        errors: [
          {
            ...createZoneError('../server/b'),
            line: 1,
            column: 20,
          },
        ],
      }),
      tInvalid({
        code: 'import type b from "../server/b"',
        filename: testFilePath('./restricted-paths/client/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/client/**/*',
                from: './test/fixtures/restricted-paths/server',
              },
            ],
          },
        ],
        errors: [
          {
            ...createZoneError('../server/b'),
            line: 1,
            column: 20,
          },
        ],
      }),
      tInvalid({
        code: 'import type a from "../client/a"\nimport type c from "./c.ts"',
        filename: testFilePath('./restricted-paths/server/b.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server',
                from: [
                  './test/fixtures/restricted-paths/client',
                  './test/fixtures/restricted-paths/server/c.ts',
                ],
              },
            ],
          },
        ],
        errors: [
          {
            ...createZoneError('../client/a'),
            line: 1,
            column: 20,
          },
          {
            ...createZoneError('./c.ts'),
            line: 2,
            column: 20,
          },
        ],
      }),
      tInvalid({
        code: 'import type b from "../server/b"',
        filename: testFilePath('./restricted-paths/client/a'),
        settings,
        options: [
          {
            zones: [{ target: './client', from: './server' }],
            basePath: testFilePath('./restricted-paths'),
          },
        ],
        errors: [
          {
            ...createZoneError('../server/b'),
            line: 1,
            column: 20,
          },
        ],
      }),
      tInvalid({
        code: 'import type b from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server/one',
                from: './test/fixtures/restricted-paths/server',
                except: ['./one'],
              },
            ],
          },
        ],
        errors: [
          {
            ...createZoneError('../two/a'),
            line: 1,
            column: 20,
          },
        ],
      }),
      tInvalid({
        code: 'import type b from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server/one',
                from: './test/fixtures/restricted-paths/server',
                except: ['./one'],
                message: 'Custom message',
              },
            ],
          },
        ],
        errors: [
          {
            ...createZoneError('../two/a', ' Custom message'),
            line: 1,
            column: 20,
          },
        ],
      }),
      tInvalid({
        code: 'import type b from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: './test/fixtures/restricted-paths/server/one',
                from: './test/fixtures/restricted-paths/server',
                except: ['../client/a'],
              },
            ],
          },
        ],
        errors: [{ messageId: 'path', line: 1, column: 20 }],
      }),
      tInvalid({
        code: 'import type A from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: '**/*',
                from: './test/fixtures/restricted-paths/server/**/*',
              },
            ],
          },
        ],
        errors: [
          {
            ...createZoneError('../two/a'),
            line: 1,
            column: 20,
          },
        ],
      }),
      tInvalid({
        code: 'import type A from "../two/a"',

        filename: testFilePath('./restricted-paths/server/one/a.ts'),
        settings,
        options: [
          {
            zones: [
              {
                target: '**/*',
                from: './test/fixtures/restricted-paths/server/**/*',
                except: ['a.ts'],
              },
            ],
          },
        ],
        errors: [{ messageId: 'glob', line: 1, column: 20 }],
      }),
    ],
  })
})
