import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { parsers, test, testFilePath } from '../utils'

import rule from 'eslint-plugin-import-x/rules/no-restricted-paths'

const ruleTester = new TSESLintRuleTester()

ruleTester.run('no-restricted-paths', rule, {
  valid: [
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({
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
    test({ code: 'notrequire("../server/b.js")' }),
    test({
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
    test({ code: 'require("../server/b.js")' }),
    test({ code: 'import b from "../server/b.js"' }),

    // builtin (ignore)
    test({ code: 'require("os")' }),
  ],

  invalid: [
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    // TODO: fix test on windows
    ...(process.platform === 'win32'
      ? []
      : [
          test({
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
                message:
                  'Unexpected path "../server/b.js" imported in restricted zone.',
                line: 1,
                column: 15,
              },
            ],
          }),
        ]),
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
          message: 'Unexpected path "../client/a" imported in restricted zone.',
          line: 1,
          column: 15,
        },
        {
          message: 'Unexpected path "./c" imported in restricted zone.',
          line: 2,
          column: 15,
        },
      ],
    }),
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 19,
        },
      ],
    }),
    test({
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
          message: 'Unexpected path "../two/a.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
          message:
            'Unexpected path "../two/a.js" imported in restricted zone. Custom message',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
      errors: [
        {
          message:
            'Restricted path exceptions must be descendants of the configured `from` path for that zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
          message: 'Unexpected path "../two/a.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
      errors: [
        {
          message:
            'Restricted path exceptions must be glob patterns when `from` contains glob patterns',
          line: 1,
          column: 15,
        },
      ],
    }),

    // support of arrays for from and target
    // array with single element
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    // array with multiple elements
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
          message:
            'Unexpected path "../server/one/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
        {
          message:
            'Unexpected path "../server/two/a.js" imported in restricted zone.',
          line: 2,
          column: 15,
        },
      ],
    }),
    // array with multiple glob patterns in from
    test({
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
          message:
            'Unexpected path "../server/one/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
        {
          message:
            'Unexpected path "../server/two/a.js" imported in restricted zone.',
          line: 2,
          column: 15,
        },
      ],
    }),
    // array with mix of glob and non glob patterns in target
    test({
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
          message:
            'Unexpected path "../server/b.js" imported in restricted zone.',
          line: 1,
          column: 15,
        },
      ],
    }),
    // configuration format
    test({
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
      errors: [
        {
          message:
            'Restricted path exceptions must be glob patterns when `from` contains glob patterns',
          line: 1,
          column: 15,
        },
      ],
    }),
    test({
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
      errors: [
        {
          message:
            'Restricted path `from` must contain either only glob patterns or none',
          line: 1,
          column: 15,
        },
      ],
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
      test({
        code: 'import type a from "../client/a.ts"',
        filename: testFilePath('./restricted-paths/server/b.ts'),
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

        settings,
      }),
      test({
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
      test({
        code: 'import type a from "../client/a.ts"',
        filename: testFilePath('./restricted-paths/client/b.ts'),
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

        settings,
      }),
      test({
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
      test({
        code: 'import type a from "./a.ts"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
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

        settings,
      }),
      test({
        code: 'import type a from "../two/a.ts"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
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

        settings,
      }),
      test({
        code: 'import type a from "../one/a.ts"',
        filename: testFilePath('./restricted-paths/server/two-new/a.ts'),
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

        settings,
      }),
      test({
        code: 'import type A from "../two/a.ts"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
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

        settings,
      }),
      // no config
      test({ code: 'import type b from "../server/b.js"', settings }),
      test({
        code: 'import type * as b from "../server/b.js"',

        settings,
      }),
    ],
    invalid: [
      test({
        code: 'import type b from "../server/b"',
        filename: testFilePath('./restricted-paths/client/a.ts'),
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
            message:
              'Unexpected path "../server/b" imported in restricted zone.',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type b from "../server/b"',
        filename: testFilePath('./restricted-paths/client/a.ts'),
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
            message:
              'Unexpected path "../server/b" imported in restricted zone.',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type a from "../client/a"\nimport type c from "./c.ts"',
        filename: testFilePath('./restricted-paths/server/b.ts'),
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
            message:
              'Unexpected path "../client/a" imported in restricted zone.',
            line: 1,
            column: 20,
          },
          {
            message: 'Unexpected path "./c.ts" imported in restricted zone.',
            line: 2,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type b from "../server/b"',
        filename: testFilePath('./restricted-paths/client/a'),
        options: [
          {
            zones: [{ target: './client', from: './server' }],
            basePath: testFilePath('./restricted-paths'),
          },
        ],
        errors: [
          {
            message:
              'Unexpected path "../server/b" imported in restricted zone.',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type b from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
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
            message: 'Unexpected path "../two/a" imported in restricted zone.',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type b from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a'),
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
            message:
              'Unexpected path "../two/a" imported in restricted zone. Custom message',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type b from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
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
        errors: [
          {
            message:
              'Restricted path exceptions must be descendants of the configured `from` path for that zone.',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type A from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
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
            message: 'Unexpected path "../two/a" imported in restricted zone.',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
      test({
        code: 'import type A from "../two/a"',
        filename: testFilePath('./restricted-paths/server/one/a.ts'),
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
        errors: [
          {
            message:
              'Restricted path exceptions must be glob patterns when `from` contains glob patterns',
            line: 1,
            column: 20,
          },
        ],

        settings,
      }),
    ],
  })
})
