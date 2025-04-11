import { cjsRequire, cjsRequire as require } from '@pkgr/core'
import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TestCaseError as TSESLintTestCaseError } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'

import {
  createRuleTestCaseFunctions,
  parsers,
  getNonDefaultParsers,
  testFilePath,
} from '../utils.js'
import type { GetRuleModuleMessageIds } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/order'

const ruleTester = new TSESLintRuleTester()

const flowRuleTester = new TSESLintRuleTester({
  languageOptions: {
    parser: cjsRequire(parsers.BABEL),
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        configFile: false,
        babelrc: false,
        presets: ['@babel/flow'],
      },
    },
  },
})

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

function createOrderError(
  data: [string, 'before' | 'after', string],
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  const [secondImport, order, firstImport] = data
  return { messageId: 'order', data: { secondImport, order, firstImport } }
}

function createGenericError(
  error: string,
): TSESLintTestCaseError<GetRuleModuleMessageIds<typeof rule>> {
  return { messageId: 'error', data: { error } }
}

ruleTester.run('order', rule, {
  valid: [
    // Default order using require
    tValid({
      code: `
        var fs = require('fs');
        var async = require('async');
        var relParent1 = require('../foo');
        var relParent2 = require('../foo/bar');
        var relParent3 = require('../');
        var relParent4 = require('..');
        var sibling = require('./foo');
        var index = require('./');`,
    }),
    // Default order using import
    tValid({
      code: `
        import fs from 'fs';
        import async, {foo1} from 'async';
        import relParent1 from '../foo';
        import relParent2, {foo2} from '../foo/bar';
        import relParent3 from '../';
        import sibling, {foo3} from './foo';
        import index from './';`,
    }),
    // Multiple module of the same rank next to each other
    tValid({
      code: `
        var fs = require('fs');
        var fs = require('fs');
        var path = require('path');
        var _ = require('lodash');
        var async = require('async');`,
    }),
    // Overriding order to be the reverse of the default order
    tValid({
      code: `
        var index = require('./');
        var sibling = require('./foo');
        var relParent3 = require('../');
        var relParent2 = require('../foo/bar');
        var relParent1 = require('../foo');
        var async = require('async');
        var fs = require('fs');
      `,
      options: [
        { groups: ['index', 'sibling', 'parent', 'external', 'builtin'] },
      ],
    }),
    // Ignore dynamic requires
    tValid({
      code: `
        var path = require('path');
        var _ = require('lodash');
        var async = require('async');
        var fs = require('f' + 's');`,
    }),
    // Ignore non-require call expressions
    tValid({
      code: `
        var path = require('path');
        var result = add(1, 2);
        var _ = require('lodash');`,
    }),
    // Ignore requires that are not at the top-level #1
    tValid({
      code: `
        var index = require('./');
        function foo() {
          var fs = require('fs');
        }
        () => require('fs');
        if (a) {
          require('fs');
        }`,
    }),
    // Ignore requires that are not at the top-level #2
    tValid({
      code: `
        const foo = [
          require('./foo'),
          require('fs'),
        ]`,
    }),
    // Ignore requires in template literal (#1936)
    tValid({
      code: "const foo = `${require('./a')} ${require('fs')}`",
    }),
    // Ignore unknown/invalid cases
    tValid({
      code: `
        var unknown1 = require('/unknown1');
        var fs = require('fs');
        var unknown2 = require('/unknown2');
        var async = require('async');
        var unknown3 = require('/unknown3');
        var foo = require('../foo');
        var unknown4 = require('/unknown4');
        var bar = require('../foo/bar');
        var unknown5 = require('/unknown5');
        var parent = require('../');
        var unknown6 = require('/unknown6');
        var foo = require('./foo');
        var unknown7 = require('/unknown7');
        var index = require('./');
        var unknown8 = require('/unknown8');
    `,
    }),
    // Ignoring unassigned values by default (require)
    tValid({
      code: `
        require('./foo');
        require('fs');
        var path = require('path');
    `,
    }),
    // Ignoring unassigned values by default (import)
    tValid({
      code: `
        import './foo';
        import 'fs';
        import path from 'path';
    `,
    }),
    // No imports
    tValid({
      code: `
        function add(a, b) {
          return a + b;
        }
        var foo;
    `,
    }),
    // Grouping import types
    tValid({
      code: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');

        var sibling = require('./foo');
        var relParent3 = require('../');
        var async = require('async');
        var relParent1 = require('../foo');
      `,
      options: [
        {
          groups: [
            ['builtin', 'index'],
            ['sibling', 'parent', 'external'],
          ],
        },
      ],
    }),
    // Omitted types should implicitly be considered as the last type
    tValid({
      code: `
        var index = require('./');
        var path = require('path');
      `,
      options: [
        {
          groups: [
            'index',
            ['sibling', 'parent', 'external'],
            // missing 'builtin'
          ],
        },
      ],
    }),
    // Mixing require and import should have import up top
    tValid({
      code: `
        import async, {foo1} from 'async';
        import relParent2, {foo2} from '../foo/bar';
        import sibling, {foo3} from './foo';
        var fs = require('fs');
        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var index = require('./');
      `,
    }),
    // Export equals expressions should be on top alongside with ordinary import-statements.
    tValid({
      code: `
        import async, {foo1} from 'async';
        import relParent2, {foo2} from '../foo/bar';
        import sibling, {foo3} from './foo';
        var fs = require('fs');
        var util = require("util");
        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var index = require('./');
      `,
    }),

    tValid({
      code: `
        export import CreateSomething = _CreateSomething;
      `,
    }),
    // Adding unknown import types (e.g. using a resolver alias via babel) to the groups.
    tValid({
      code: `
        import fs from 'fs';
        import { Input } from '-/components/Input';
        import { Button } from '-/components/Button';
        import { add } from './helper';`,
      options: [
        {
          groups: [
            'builtin',
            'external',
            'unknown',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
    }),
    // Using unknown import types (e.g. using a resolver alias via babel) with
    // an alternative custom group list.
    tValid({
      code: `
        import { Input } from '-/components/Input';
        import { Button } from '-/components/Button';
        import fs from 'fs';
        import { add } from './helper';`,
      options: [
        {
          groups: [
            'unknown',
            'builtin',
            'external',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
    }),
    // Using unknown import types (e.g. using a resolver alias via babel)
    // Option: newlines-between: 'always'
    tValid({
      code: `
        import fs from 'fs';

        import { Input } from '-/components/Input';
        import { Button } from '-/components/Button';

        import p from '..';
        import q from '../';

        import { add } from './helper';

        import i from '.';
        import j from './';`,
      options: [
        {
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'unknown',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
    }),

    // Using pathGroups to customize ordering, position 'after'
    tValid({
      code: `
        import fs from 'fs';
        import _ from 'lodash';
        import { Input } from '~/components/Input';
        import { Button } from '#/components/Button';
        import { add } from './helper';`,
      options: [
        {
          pathGroups: [
            { pattern: '~/**', group: 'external', position: 'after' },
            { pattern: '#/**', group: 'external', position: 'after' },
          ],
        },
      ],
    }),
    // pathGroup without position means "equal" with group
    tValid({
      code: `
        import fs from 'fs';
        import { Input } from '~/components/Input';
        import async from 'async';
        import { Button } from '#/components/Button';
        import _ from 'lodash';
        import { add } from './helper';`,
      options: [
        {
          pathGroups: [
            { pattern: '~/**', group: 'external' },
            { pattern: '#/**', group: 'external' },
          ],
        },
      ],
    }),
    // Using pathGroups to customize ordering, position 'before'
    tValid({
      code: `
        import fs from 'fs';

        import { Input } from '~/components/Input';

        import { Button } from '#/components/Button';

        import _ from 'lodash';

        import { add } from './helper';`,
      options: [
        {
          'newlines-between': 'always',
          pathGroups: [
            { pattern: '~/**', group: 'external', position: 'before' },
            { pattern: '#/**', group: 'external', position: 'before' },
          ],
        },
      ],
    }),
    // Using pathGroups to customize ordering, with patternOptions
    tValid({
      code: `
        import fs from 'fs';

        import _ from 'lodash';

        import { Input } from '~/components/Input';

        import { Button } from '!/components/Button';

        import { add } from './helper';`,
      options: [
        {
          'newlines-between': 'always',
          pathGroups: [
            { pattern: '~/**', group: 'external', position: 'after' },
            {
              pattern: '!/**',
              patternOptions: { nonegate: true },
              group: 'external',
              position: 'after',
            },
          ],
        },
      ],
    }),
    // Using pathGroups to customize ordering for imports that are recognized as 'external'
    // by setting pathGroupsExcludedImportTypes without 'external'
    tValid({
      code: `
        import fs from 'fs';

        import { Input } from '@app/components/Input';

        import { Button } from '@app2/components/Button';

        import _ from 'lodash';

        import { add } from './helper';`,
      options: [
        {
          'newlines-between': 'always',
          pathGroupsExcludedImportTypes: ['builtin'],
          pathGroups: [
            { pattern: '@app/**', group: 'external', position: 'before' },
            { pattern: '@app2/**', group: 'external', position: 'before' },
          ],
        },
      ],
    }),
    // Using pathGroups (a test case for https://github.com/import-js/eslint-plugin-import-x/pull/1724)
    tValid({
      code: `
        import fs from 'fs';
        import external from 'external';
        import externalTooPlease from './make-me-external';

        import sibling from './sibling';`,
      options: [
        {
          'newlines-between': 'always',
          pathGroupsExcludedImportTypes: [],
          pathGroups: [{ pattern: './make-me-external', group: 'external' }],
          groups: [
            ['builtin', 'external'],
            'internal',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
    }),
    // Monorepo setup, using Webpack resolver, workspace folder name in external-module-folders
    tValid({
      code: `
        import _ from 'lodash';
        import m from '@test-scope/some-module';

        import bar from './bar';
      `,
      options: [
        {
          'newlines-between': 'always',
        },
      ],
      settings: {
        'import-x/resolver': 'webpack',
        'import-x/external-module-folders': [
          'node_modules',
          'symlinked-module',
        ],
      },
    }),
    // Monorepo setup, using Node resolver (doesn't resolve symlinks)
    tValid({
      code: `
        import _ from 'lodash';
        import m from '@test-scope/some-module';

        import bar from './bar';
      `,
      options: [
        {
          'newlines-between': 'always',
        },
      ],
      settings: {
        'import-x/resolver': 'node',
        'import-x/external-module-folders': [
          'node_modules',
          'symlinked-module',
        ],
      },
    }),
    // Option: newlines-between: 'always'
    tValid({
      code: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');



        var sibling = require('./foo');


        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var async = require('async');
      `,
      options: [
        {
          groups: [['builtin', 'index'], ['sibling'], ['parent', 'external']],
          'newlines-between': 'always',
        },
      ],
    }),
    // Option: newlines-between: 'never'
    tValid({
      code: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');
        var sibling = require('./foo');
        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var async = require('async');
      `,
      options: [
        {
          groups: [['builtin', 'index'], ['sibling'], ['parent', 'external']],
          'newlines-between': 'never',
        },
      ],
    }),
    // Option: newlines-between: 'ignore'
    tValid({
      code: `
      var fs = require('fs');

      var index = require('./');
      var path = require('path');
      var sibling = require('./foo');


      var relParent1 = require('../foo');

      var relParent3 = require('../');
      var async = require('async');
      `,
      options: [
        {
          groups: [['builtin', 'index'], ['sibling'], ['parent', 'external']],
          'newlines-between': 'ignore',
        },
      ],
    }),
    // 'ignore' should be the default value for `newlines-between`
    tValid({
      code: `
      var fs = require('fs');

      var index = require('./');
      var path = require('path');
      var sibling = require('./foo');


      var relParent1 = require('../foo');

      var relParent3 = require('../');

      var async = require('async');
      `,
      options: [
        {
          groups: [['builtin', 'index'], ['sibling'], ['parent', 'external']],
        },
      ],
    }),
    // Option newlines-between: 'always' with multiline imports #1
    tValid({
      code: `
        import path from 'path';

        import {
            I,
            Want,
            Couple,
            Imports,
            Here
        } from 'bar';
        import external from 'external'
      `,
      options: [{ 'newlines-between': 'always' }],
    }),
    // Option newlines-between: 'always' with multiline imports #2
    tValid({
      code: `
        import path from 'path';
        import net
          from 'net';

        import external from 'external'
      `,
      options: [{ 'newlines-between': 'always' }],
    }),
    // Option newlines-between: 'always' with multiline imports #3
    tValid({
      code: `
        import foo
          from '../../../../this/will/be/very/long/path/and/therefore/this/import-x/has/to/be/in/two/lines';

        import bar
          from './sibling';
      `,
      options: [{ 'newlines-between': 'always' }],
    }),
    // Option newlines-between: 'always' with not assigned import #1
    tValid({
      code: `
        import path from 'path';

        import 'loud-rejection';
        import 'something-else';

        import _ from 'lodash';
      `,
      options: [{ 'newlines-between': 'always' }],
    }),
    // Option newlines-between: 'never' with not assigned import #2
    tValid({
      code: `
        import path from 'path';
        import 'loud-rejection';
        import 'something-else';
        import _ from 'lodash';
      `,
      options: [{ 'newlines-between': 'never' }],
    }),
    // Option newlines-between: 'always' with not assigned require #1
    tValid({
      code: `
        var path = require('path');

        require('loud-rejection');
        require('something-else');

        var _ = require('lodash');
      `,
      options: [{ 'newlines-between': 'always' }],
    }),
    // Option newlines-between: 'never' with not assigned require #2
    tValid({
      code: `
        var path = require('path');
        require('loud-rejection');
        require('something-else');
        var _ = require('lodash');
      `,
      options: [{ 'newlines-between': 'never' }],
    }),
    // Option newlines-between: 'never' should ignore nested require statement's #1
    tValid({
      code: `
        var some = require('asdas');
        var config = {
          port: 4444,
          runner: {
            server_path: require('runner-binary').path,

            cli_args: {
                'webdriver.chrome.driver': require('browser-binary').path
            }
          }
        }
      `,
      options: [{ 'newlines-between': 'never' }],
    }),
    // Option newlines-between: 'always' should ignore nested require statement's #2
    tValid({
      code: `
        var some = require('asdas');
        var config = {
          port: 4444,
          runner: {
            server_path: require('runner-binary').path,
            cli_args: {
                'webdriver.chrome.driver': require('browser-binary').path
            }
          }
        }
      `,
      options: [{ 'newlines-between': 'always' }],
    }),
    // Option: newlines-between: 'always-and-inside-groups'
    tValid({
      code: `
        var fs = require('fs');
        var path = require('path');

        var util = require('util');

        var async = require('async');

        var relParent1 = require('../foo');
        var relParent2 = require('../');

        var relParent3 = require('../bar');

        var sibling = require('./foo');
        var sibling2 = require('./bar');

        var sibling3 = require('./foobar');
      `,
      options: [
        {
          'newlines-between': 'always-and-inside-groups',
        },
      ],
    }),
    // Option alphabetize: {order: 'ignore'}
    tValid({
      code: `
        import a from 'foo';
        import b from 'bar';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'ignore' },
        },
      ],
    }),
    // Option alphabetize: {order: 'asc'}
    tValid({
      code: `
        import c from 'Bar';
        import b from 'bar';
        import a from 'foo';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'asc' },
        },
      ],
    }),
    // Option alphabetize: {order: 'desc'}
    tValid({
      code: `
        import a from 'foo';
        import b from 'bar';
        import c from 'Bar';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'desc' },
        },
      ],
    }),
    // Option alphabetize: {order: 'asc'} and move nested import entries closer to the main import entry
    tValid({
      code: `
        import a from "foo";
        import c from "foo/bar";
        import d from "foo/barfoo";
        import b from "foo-bar";
      `,
      options: [{ alphabetize: { order: 'asc' } }],
    }),
    // Option alphabetize: {order: 'asc'} and move nested import entries closer to the main import entry
    tValid({
      code: `
        import a from "foo";
        import c from "foo/foobar/bar";
        import d from "foo/foobar/barfoo";
        import b from "foo-bar";
      `,
      options: [{ alphabetize: { order: 'asc' } }],
    }),
    // Option alphabetize: {order: 'desc'} and move nested import entries closer to the main import entry
    tValid({
      code: `
        import b from "foo-bar";
        import d from "foo/barfoo";
        import c from "foo/bar";
        import a from "foo";
      `,
      options: [{ alphabetize: { order: 'desc' } }],
    }),
    // Option alphabetize: {order: 'desc'} and move nested import entries closer to the main import entry with file names having non-alphanumeric characters.
    tValid({
      code: `
        import b from "foo-bar";
        import c from "foo,bar";
        import d from "foo/barfoo";
        import a from "foo";`,
      options: [
        {
          alphabetize: { order: 'desc' },
        },
      ],
    }),
    // Option alphabetize with newlines-between: {order: 'asc', newlines-between: 'always'}
    tValid({
      code: `
        import b from 'Bar';
        import c from 'bar';
        import a from 'foo';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'asc' },
          'newlines-between': 'always',
        },
      ],
    }),
    // Alphabetize with require
    tValid({
      code: `
        import { hello } from './hello';
        import { int } from './int';
        const blah = require('./blah');
        const { cello } = require('./cello');
      `,
      options: [
        {
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    }),
    // Order of imports with similar names
    tValid({
      code: `
        import React from 'react';
        import { BrowserRouter } from 'react-router-dom';
      `,
      options: [
        {
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    }),
    tValid({
      code: `
        import { UserInputError } from 'apollo-server-express';

        import { new as assertNewEmail } from '~/Assertions/Email';
      `,
      options: [
        {
          alphabetize: {
            caseInsensitive: true,
            order: 'asc',
          },
          pathGroups: [{ pattern: '~/*', group: 'internal' }],
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
        },
      ],
    }),
    tValid({
      code: `
        import { ReactElement, ReactNode } from 'react';

        import { util } from 'Internal/lib';

        import { parent } from '../parent';

        import { sibling } from './sibling';
      `,
      options: [
        {
          alphabetize: {
            caseInsensitive: true,
            order: 'asc',
          },
          pathGroups: [{ pattern: 'Internal/**/*', group: 'internal' }],
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          pathGroupsExcludedImportTypes: [],
        },
      ],
    }),
    // Order of the `import ... = require(...)` syntax
    tValid({
      code: `
        import blah = require('./blah');
        import { hello } from './hello';`,

      options: [
        {
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    }),
    // Order of object-imports
    tValid({
      code: `
        import blah = require('./blah');
        import log = console.log;`,

      options: [
        {
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    }),
    // Object-imports should not be forced to be alphabetized
    tValid({
      code: `
        import debug = console.debug;
        import log = console.log;`,

      options: [
        {
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    }),
    tValid({
      code: `
        import log = console.log;
        import debug = console.debug;`,

      options: [
        {
          alphabetize: {
            order: 'asc',
          },
        },
      ],
    }),
    tValid({
      code: `
        import { a } from "./a";
        export namespace SomeNamespace {
            export import a2 = a;
        }
      `,

      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'asc' },
        },
      ],
    }),
    // Using `@/*` to alias internal modules
    tValid({
      code: `
        import fs from 'fs';

        import express from 'express';

        import service from '@/api/service';

        import fooParent from '../foo';

        import fooSibling from './foo';

        import index from './';

        import internalDoesNotExistSoIsUnknown from '@/does-not-exist';
      `,
      options: [
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'unknown',
          ],
          'newlines-between': 'always',
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
    // Option pathGroup[].distinctGroup: 'true' does not prevent 'position' properties from affecting the visible grouping
    tValid({
      code: `
        import A from 'a';

        import C from 'c';

        import B from 'b';
      `,
      options: [
        {
          'newlines-between': 'always',
          distinctGroup: true,
          pathGroupsExcludedImportTypes: [],
          pathGroups: [
            {
              pattern: 'a',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'b',
              group: 'external',
              position: 'after',
            },
          ],
        },
      ],
    }),
    // Option pathGroup[].distinctGroup: 'false' should prevent 'position' properties from affecting the visible grouping
    tValid({
      code: `
        import A from 'a';
        import C from 'c';
        import B from 'b';
      `,
      options: [
        {
          'newlines-between': 'always',
          distinctGroup: false,
          pathGroupsExcludedImportTypes: [],
          pathGroups: [
            {
              pattern: 'a',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'b',
              group: 'external',
              position: 'after',
            },
          ],
        },
      ],
    }),
    // Option pathGroup[].distinctGroup: 'false' should prevent 'position' properties from affecting the visible grouping 2
    tValid({
      code: `
        import A from 'a';

        import b from './b';
        import B from './B';
      `,
      options: [
        {
          'newlines-between': 'always',
          distinctGroup: false,
          pathGroupsExcludedImportTypes: [],
          pathGroups: [
            {
              pattern: 'a',
              group: 'external',
            },
            {
              pattern: 'b',
              group: 'internal',
              position: 'before',
            },
          ],
        },
      ],
    }),
    // Option pathGroup[].distinctGroup: 'false' should prevent 'position' properties from affecting the visible grouping 3
    tValid({
      code: `
        import A from "baz";
        import B from "Bar";
        import C from "Foo";

        import D from "..";
        import E from "../";
        import F from "../baz";
        import G from "../Bar";
        import H from "../Foo";

        import I from ".";
        import J from "./baz";
        import K from "./Bar";
        import L from "./Foo";
      `,
      options: [
        {
          alphabetize: {
            caseInsensitive: false,
            order: 'asc',
          },
          'newlines-between': 'always',
          groups: [
            ['builtin', 'external', 'internal', 'unknown', 'object', 'type'],
            'parent',
            ['sibling', 'index'],
          ],
          distinctGroup: false,
          pathGroupsExcludedImportTypes: [],
          pathGroups: [
            {
              pattern: './',
              group: 'sibling',
              position: 'before',
            },
            {
              pattern: '.',
              group: 'sibling',
              position: 'before',
            },
            {
              pattern: '..',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: '../',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: '[a-z]*',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '../[a-z]*',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: './[a-z]*',
              group: 'sibling',
              position: 'before',
            },
          ],
        },
      ],
    }),
    // orderImportKind option that is not used
    tValid({
      code: `
        import B from './B';
        import b from './b';
      `,
      options: [
        {
          alphabetize: {
            order: 'asc',
            orderImportKind: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    }),
    // named import order
    tValid({
      code: `
        import { a, B as C, Z } from './Z';
        const { D, n: c, Y } = require('./Z');
        export { C, D };
        export { A, B, C as default } from "./Z";
        const { ["ignore require-statements with non-identifier imports"]: z, d } = require("./Z");
        exports = { ["ignore exports statements with non-identifiers"]: Z, D };
      `,
      options: [
        {
          named: true,
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    }),
    tValid({
      code: `
        const { b, A } = require('./Z');
      `,
      options: [
        {
          named: true,
          alphabetize: { order: 'desc' },
        },
      ],
    }),
    tValid({
      code: `
        import { A, B } from "./Z";
        export { Z, A } from "./Z";
        export { N, P } from "./Z";
        const { X, Y } = require("./Z");
      `,
      options: [
        {
          named: {
            require: true,
            import: true,
            export: false,
          },
        },
      ],
    }),
    tValid({
      code: `
        import { B, A } from "./Z";
        const { D, C } = require("./Z");
        export { B, A } from "./Z";
      `,
      options: [
        {
          named: {
            require: false,
            import: false,
            export: false,
          },
        },
      ],
    }),
    tValid({
      code: `
        import { B, A, R } from "foo";
        const { D, O, G } = require("tunes");
        export { B, A, Z } from "foo";
      `,
      options: [
        {
          named: { enabled: false },
        },
      ],
    }),
    tValid({
      code: `
        import { A as A, A as B, A as C } from "./Z";
        const { a, a: b, a: c } = require("./Z");
      `,
      options: [
        {
          named: true,
        },
      ],
    }),
    tValid({
      code: `
        import { A, B, C } from "./Z";
        exports = { A, B, C };
        module.exports = { a: A, b: B, c: C };
      `,
      options: [
        {
          named: {
            cjsExports: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
    }),
    tValid({
      code: `
        module.exports.A = { };
        module.exports.A.B = { };
        module.exports.B = { };
        exports.C = { };
      `,
      options: [
        {
          named: {
            cjsExports: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
    }),
    // ensure other assignments are untouched
    tValid({
      code: `
        var exports = null;
        var module = null;
        exports = { };
        module = { };
        module.exports = { };
        module.exports.U = { };
        module.exports.N = { };
        module.exports.C = { };
        exports.L = { };
        exports.E = { };
      `,
      options: [
        {
          named: {
            cjsExports: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
    }),
    tValid({
      code: `
        exports["B"] = { };
        exports["C"] = { };
        exports["A"] = { };
      `,
      options: [
        {
          named: {
            cjsExports: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
    }),
  ],
  invalid: [
    // builtin before external module (require)
    tInvalid({
      code: `
        var async = require('async');
        var fs = require('fs');
      `,
      output: `
        var fs = require('fs');
        var async = require('async');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // fix order with spaces on the end of line
    tInvalid({
      code: `
        var async = require('async');
        var fs = require('fs');${' '}
      `,
      output: `
        var fs = require('fs');${' '}
        var async = require('async');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // fix order with comment on the end of line
    tInvalid({
      code: `
        var async = require('async');
        var fs = require('fs'); /* comment */
      `,
      output: `
        var fs = require('fs'); /* comment */
        var async = require('async');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // fix order with comments at the end and start of line
    tInvalid({
      code: `
        /* comment1 */  var async = require('async'); /* comment2 */
        /* comment3 */  var fs = require('fs'); /* comment4 */
      `,
      output: `
        /* comment3 */  var fs = require('fs'); /* comment4 */
        /* comment1 */  var async = require('async'); /* comment2 */
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // fix order with few comments at the end and start of line
    tInvalid({
      code: `
        /* comment0 */  /* comment1 */  var async = require('async'); /* comment2 */
        /* comment3 */  var fs = require('fs'); /* comment4 */
      `,
      output: `
        /* comment3 */  var fs = require('fs'); /* comment4 */
        /* comment0 */  /* comment1 */  var async = require('async'); /* comment2 */
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // fix order with windows end of lines
    tInvalid({
      code:
        `/* comment0 */  /* comment1 */  var async = require('async'); /* comment2 */` +
        `\r\n` +
        `/* comment3 */  var fs = require('fs'); /* comment4 */` +
        `\r\n`,
      output:
        `/* comment3 */  var fs = require('fs'); /* comment4 */` +
        `\r\n` +
        `/* comment0 */  /* comment1 */  var async = require('async'); /* comment2 */` +
        `\r\n`,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // fix order with multilines comments at the end and start of line
    tInvalid({
      code: `
        /* multiline1
          comment1 */  var async = require('async'); /* multiline2
          comment2 */  var fs = require('fs'); /* multiline3
          comment3 */
      `,
      output:
        `
        /* multiline1
          comment1 */  var fs = require('fs');` +
        ' ' +
        `
  var async = require('async'); /* multiline2
          comment2 *//* multiline3
          comment3 */
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // fix destructured commonjs import
    tInvalid({
      code: `
        var {b} = require('async');
        var {a} = require('fs');
      `,
      output: `
        var {a} = require('fs');
        var {b} = require('async');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // fix order of multiline import
    tInvalid({
      code: `
        var async = require('async');
        var fs =
          require('fs');
      `,
      output: `
        var fs =
          require('fs');
        var async = require('async');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // fix order at the end of file
    tInvalid({
      code: `
        var async = require('async');
        var fs = require('fs');`,
      output:
        `
        var fs = require('fs');
        var async = require('async');` + '\n',
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // builtin before external module (import)
    tInvalid({
      code: `
        import async from 'async';
        import fs from 'fs';
      `,
      output: `
        import fs from 'fs';
        import async from 'async';
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // builtin before external module (mixed import and require)
    tInvalid({
      code: `
        var async = require('async');
        import fs from 'fs';
      `,
      output: `
        import fs from 'fs';
        var async = require('async');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // external before parent
    tInvalid({
      code: `
        var parent = require('../parent');
        var async = require('async');
      `,
      output: `
        var async = require('async');
        var parent = require('../parent');
      `,
      errors: [
        createOrderError(['`async` import', 'before', 'import of `../parent`']),
      ],
    }),
    // parent before sibling
    tInvalid({
      code: `
        var sibling = require('./sibling');
        var parent = require('../parent');
      `,
      output: `
        var parent = require('../parent');
        var sibling = require('./sibling');
      `,
      errors: [
        createOrderError([
          '`../parent` import',
          'before',
          'import of `./sibling`',
        ]),
      ],
    }),
    // sibling before index
    tInvalid({
      code: `
        var index = require('./');
        var sibling = require('./sibling');
      `,
      output: `
        var sibling = require('./sibling');
        var index = require('./');
      `,
      errors: [
        createOrderError(['`./sibling` import', 'before', 'import of `./`']),
      ],
    }),
    // Multiple errors
    tInvalid({
      code: `
    var sibling = require('./sibling');
    var async = require('async');
    var fs = require('fs');
  `,
      output: [
        `
    var async = require('async');
    var sibling = require('./sibling');
    var fs = require('fs');
  `,
        `
    var fs = require('fs');
    var async = require('async');
    var sibling = require('./sibling');
  `,
      ],
      errors: [
        createOrderError(['`async` import', 'before', 'import of `./sibling`']),
        createOrderError(['`fs` import', 'before', 'import of `./sibling`']),
      ],
    }),
    // Uses 'after' wording if it creates less errors
    tInvalid({
      code: `
        var index = require('./');
        var fs = require('fs');
        var path = require('path');
        var _ = require('lodash');
        var foo = require('foo');
        var bar = require('bar');
      `,
      output: `
        var fs = require('fs');
        var path = require('path');
        var _ = require('lodash');
        var foo = require('foo');
        var bar = require('bar');
        var index = require('./');
      `,
      errors: [createOrderError(['`./` import', 'after', 'import of `bar`'])],
    }),
    // Overriding order to be the reverse of the default order
    tInvalid({
      code: `
        var fs = require('fs');
        var index = require('./');
      `,
      output: `
        var index = require('./');
        var fs = require('fs');
      `,
      options: [
        { groups: ['index', 'sibling', 'parent', 'external', 'builtin'] },
      ],
      errors: [createOrderError(['`./` import', 'before', 'import of `fs`'])],
    }),
    // member expression of require
    tInvalid({
      code: `
        var foo = require('./foo').bar;
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `./foo`']),
      ],
    }),
    // nested member expression of require
    tInvalid({
      code: `
        var foo = require('./foo').bar.bar.bar;
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `./foo`']),
      ],
    }),
    // fix near nested member expression of require with newlines
    tInvalid({
      code: `
        var foo = require('./foo').bar
          .bar
          .bar;
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `./foo`']),
      ],
    }),
    // fix nested member expression of require with newlines
    tInvalid({
      code: `
        var foo = require('./foo');
        var fs = require('fs').bar
          .bar
          .bar;
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `./foo`']),
      ],
    }),
    // Grouping import types
    tInvalid({
      code: `
        var fs = require('fs');
        var index = require('./');
        var sibling = require('./foo');
        var path = require('path');
      `,
      output: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');
        var sibling = require('./foo');
      `,
      options: [
        {
          groups: [
            ['builtin', 'index'],
            ['sibling', 'parent', 'external'],
          ],
        },
      ],
      errors: [
        createOrderError(['`path` import', 'before', 'import of `./foo`']),
      ],
    }),
    // Omitted types should implicitly be considered as the last type
    tInvalid({
      code: `
        var path = require('path');
        var async = require('async');
      `,
      output: `
        var async = require('async');
        var path = require('path');
      `,
      options: [
        {
          groups: [
            'index',
            ['sibling', 'parent', 'external', 'internal'],
            // missing 'builtin'
          ],
        },
      ],
      errors: [
        createOrderError(['`async` import', 'before', 'import of `path`']),
      ],
    }),
    // Setting the order for an unknown type
    // should make the rule trigger an error and do nothing else
    tInvalid({
      code: `
        var async = require('async');
        var index = require('./');
      `,
      options: [
        // @ts-expect-error testing incorrect options
        { groups: ['index', ['sibling', 'parent', 'UNKNOWN', 'internal']] },
      ],
      errors: [
        createGenericError(
          'Incorrect configuration of the rule: Unknown type `"UNKNOWN"`',
        ),
      ],
    }),
    // Type in an array can't be another array, too much nesting
    tInvalid({
      code: `
        var async = require('async');
        var index = require('./');
      `,
      options: [
        // @ts-expect-error testing incorrect options
        { groups: ['index', ['sibling', 'parent', ['builtin'], 'internal']] },
      ],
      errors: [
        createGenericError(
          'Incorrect configuration of the rule: Unknown type `["builtin"]`',
        ),
      ],
    }),
    // No numbers
    tInvalid({
      code: `
        var async = require('async');
        var index = require('./');
      `,
      // @ts-expect-error testing incorrect options
      options: [{ groups: ['index', ['sibling', 'parent', 2, 'internal']] }],
      errors: [
        createGenericError(
          'Incorrect configuration of the rule: Unknown type `2`',
        ),
      ],
    }),
    // Duplicate
    tInvalid({
      code: `
        var async = require('async');
        var index = require('./');
      `,
      options: [
        { groups: ['index', ['sibling', 'parent', 'parent', 'internal']] },
      ],
      errors: [
        createGenericError(
          'Incorrect configuration of the rule: `parent` is duplicated',
        ),
      ],
    }),
    // Mixing require and import should have import up top
    tInvalid({
      code: `
        import async, {foo1} from 'async';
        import relParent2, {foo2} from '../foo/bar';
        var fs = require('fs');
        var relParent1 = require('../foo');
        var relParent3 = require('../');
        import sibling, {foo3} from './foo';
        var index = require('./');
      `,
      output: `
        import async, {foo1} from 'async';
        import relParent2, {foo2} from '../foo/bar';
        import sibling, {foo3} from './foo';
        var fs = require('fs');
        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var index = require('./');
      `,
      errors: [
        createOrderError(['`./foo` import', 'before', 'import of `fs`']),
      ],
    }),
    tInvalid({
      code: `
        var fs = require('fs');
        import async, {foo1} from 'async';
        import relParent2, {foo2} from '../foo/bar';
      `,
      output: `
        import async, {foo1} from 'async';
        import relParent2, {foo2} from '../foo/bar';
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'after', 'import of `../foo/bar`']),
      ],
    }),
    // Order of the `import ... = require(...)` syntax
    tInvalid({
      code: `
        var fs = require('fs');
        import async, {foo1} from 'async';
        import bar = require("../foo/bar");
      `,
      output: `
        import async, {foo1} from 'async';
        import bar = require("../foo/bar");
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'after', 'import of `../foo/bar`']),
      ],
    }),
    tInvalid({
      code: `
        var async = require('async');
        var fs = require('fs');
      `,
      output: `
        var fs = require('fs');
        var async = require('async');
      `,
      languageOptions: { parser: require(parsers.ESPREE) },
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    tInvalid({
      code: `
        import sync = require('sync');
        import async, {foo1} from 'async';

        import index from './';
      `,
      output: `
        import async, {foo1} from 'async';
        import sync = require('sync');

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [
        createOrderError(['`async` import', 'before', 'import of `sync`']),
      ],
    }),
    // Order of object-imports
    tInvalid({
      code: `
        import log = console.log;
        import blah = require('./blah');`,
      errors: [
        createOrderError([
          '`./blah` import',
          'before',
          'import of `console.log`',
        ]),
      ],
    }),
    // Default order using import with custom import alias
    tInvalid({
      code: `
        import { Button } from '-/components/Button';
        import { add } from './helper';
        import fs from 'fs';
      `,
      output: `
        import fs from 'fs';
        import { Button } from '-/components/Button';
        import { add } from './helper';
      `,
      options: [
        {
          groups: [
            'builtin',
            'external',
            'unknown',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
      errors: [
        {
          ...createOrderError([
            '`fs` import',
            'before',
            'import of `-/components/Button`',
          ]),
          line: 4,
        },
      ],
    }),
    // Default order using import with custom import alias
    tInvalid({
      code: `
        import fs from 'fs';
        import { Button } from '-/components/Button';
        import { LinkButton } from '-/components/Link';
        import { add } from './helper';
      `,
      output: `
        import fs from 'fs';

        import { Button } from '-/components/Button';
        import { LinkButton } from '-/components/Link';

        import { add } from './helper';
      `,
      options: [
        {
          groups: [
            'builtin',
            'external',
            'unknown',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
        },
      ],
      errors: [
        { messageId: 'oneLineBetweenGroups', line: 2 },
        { messageId: 'oneLineBetweenGroups', line: 4 },
      ],
    }),
    // Option newlines-between: 'never' - should report unnecessary line between groups
    tInvalid({
      code: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');

        var sibling = require('./foo');

        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var async = require('async');
      `,
      output: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');
        var sibling = require('./foo');
        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var async = require('async');
      `,
      options: [
        {
          groups: [['builtin', 'index'], ['sibling'], ['parent', 'external']],
          'newlines-between': 'never',
        },
      ],
      errors: [
        { messageId: 'noLineBetweenGroups', line: 4 },
        { messageId: 'noLineBetweenGroups', line: 6 },
      ],
    }),
    // Fix newlines-between with comments after
    tInvalid({
      code: `
        var fs = require('fs'); /* comment */

        var index = require('./');
      `,
      output: `
        var fs = require('fs'); /* comment */
        var index = require('./');
      `,
      options: [
        {
          groups: [['builtin'], ['index']],
          'newlines-between': 'never',
        },
      ],
      errors: [{ messageId: 'noLineBetweenGroups', line: 2 }],
    }),
    // Cannot fix newlines-between with multiline comment after
    tInvalid({
      code: `
        var fs = require('fs'); /* multiline
        comment */

        var index = require('./');
      `,
      options: [
        {
          groups: [['builtin'], ['index']],
          'newlines-between': 'never',
        },
      ],
      errors: [{ messageId: 'noLineBetweenGroups', line: 2 }],
    }),
    // Option newlines-between: 'always' - should report lack of newline between groups
    tInvalid({
      code: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');
        var sibling = require('./foo');
        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var async = require('async');
      `,
      output: `
        var fs = require('fs');
        var index = require('./');
        var path = require('path');

        var sibling = require('./foo');

        var relParent1 = require('../foo');
        var relParent3 = require('../');
        var async = require('async');
      `,
      options: [
        {
          groups: [['builtin', 'index'], ['sibling'], ['parent', 'external']],
          'newlines-between': 'always',
        },
      ],
      errors: [
        { messageId: 'oneLineBetweenGroups', line: 4 },
        { messageId: 'oneLineBetweenGroups', line: 5 },
      ],
    }),
    // Option newlines-between: 'always' should report unnecessary empty lines space between import groups
    tInvalid({
      code: `
        var fs = require('fs');

        var path = require('path');
        var index = require('./');

        var sibling = require('./foo');

        var async = require('async');
      `,
      output: `
        var fs = require('fs');
        var path = require('path');
        var index = require('./');

        var sibling = require('./foo');
        var async = require('async');
      `,
      options: [
        {
          groups: [
            ['builtin', 'index'],
            ['sibling', 'parent', 'external'],
          ],
          'newlines-between': 'always',
        },
      ],
      errors: [
        { messageId: 'noLineWithinGroup', line: 2 },
        { messageId: 'noLineWithinGroup', line: 7 },
      ],
    }),
    // Option newlines-between: 'never' with unassigned imports and warnOnUnassignedImports disabled
    // newline is preserved to match existing behavior
    tInvalid({
      code: `
        import path from 'path';
        import 'loud-rejection';

        import 'something-else';
        import _ from 'lodash';
      `,
      options: [
        { 'newlines-between': 'never', warnOnUnassignedImports: false },
      ],
      errors: [{ messageId: 'noLineBetweenGroups', line: 2 }],
    }),
    // Option newlines-between: 'never' with unassigned imports and warnOnUnassignedImports enabled
    tInvalid({
      code: `
        import path from 'path';
        import 'loud-rejection';

        import 'something-else';
        import _ from 'lodash';
      `,
      output: `
        import path from 'path';
        import 'loud-rejection';
        import 'something-else';
        import _ from 'lodash';
      `,
      options: [{ 'newlines-between': 'never', warnOnUnassignedImports: true }],
      errors: [{ messageId: 'noLineBetweenGroups', line: 3 }],
    }),
    // Option newlines-between: 'never' cannot fix if there are other statements between imports
    tInvalid({
      code: `
        import path from 'path';
        export const abc = 123;

        import 'something-else';
        import _ from 'lodash';
      `,
      options: [{ 'newlines-between': 'never' }],
      errors: [{ messageId: 'noLineBetweenGroups', line: 2 }],
    }),
    // Option newlines-between: 'always' should report missing empty lines when using not assigned imports
    tInvalid({
      code: `
        import path from 'path';
        import 'loud-rejection';
        import 'something-else';
        import _ from 'lodash';
      `,
      output: `
        import path from 'path';

        import 'loud-rejection';
        import 'something-else';
        import _ from 'lodash';
      `,
      options: [{ 'newlines-between': 'always' }],
      errors: [{ messageId: 'oneLineBetweenGroups', line: 2 }],
    }),
    // fix missing empty lines with single line comment after
    tInvalid({
      code: `
        import path from 'path'; // comment
        import _ from 'lodash';
      `,
      output: `
        import path from 'path'; // comment

        import _ from 'lodash';
      `,
      options: [{ 'newlines-between': 'always' }],
      errors: [{ messageId: 'oneLineBetweenGroups', line: 2 }],
    }),
    // fix missing empty lines with few line block comment after
    tInvalid({
      code: `
        import path from 'path'; /* comment */ /* comment */
        import _ from 'lodash';
      `,
      output: `
        import path from 'path'; /* comment */ /* comment */

        import _ from 'lodash';
      `,
      options: [{ 'newlines-between': 'always' }],
      errors: [{ messageId: 'oneLineBetweenGroups', line: 2 }],
    }),
    // fix missing empty lines with single line block comment after
    tInvalid({
      code: `
        import path from 'path'; /* 1
        2 */
        import _ from 'lodash';
      `,
      output: [
        `
        import path from 'path';
 /* 1
        2 */
        import _ from 'lodash';
      `,
        `
        import path from 'path';

 /* 1
        2 */
        import _ from 'lodash';
      `,
      ],
      options: [{ 'newlines-between': 'always' }],
      errors: [{ messageId: 'oneLineBetweenGroups', line: 2 }],
    }),
    // reorder fix cannot cross function call on moving below #1
    tInvalid({
      code: `
        const local = require('./local');

        fn_call();

        const global1 = require('global1');
        const global2 = require('global2');

        fn_call();
      `,
      errors: [
        createOrderError(['`./local` import', 'after', 'import of `global2`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // reorder fix cannot cross function call on moving below #2
    tInvalid({
      code: `
        const local = require('./local');
        fn_call();
        const global1 = require('global1');
        const global2 = require('global2');

        fn_call();
      `,
      errors: [
        createOrderError(['`./local` import', 'after', 'import of `global2`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // reorder fix cannot cross function call on moving below #3
    tInvalid({
      code: `
        const local1 = require('./local1');
        const local2 = require('./local2');
        const local3 = require('./local3');
        const local4 = require('./local4');
        fn_call();
        const global1 = require('global1');
        const global2 = require('global2');
        const global3 = require('global3');
        const global4 = require('global4');
        const global5 = require('global5');
        fn_call();
      `,
      errors: [
        createOrderError(['`./local1` import', 'after', 'import of `global5`']),
        createOrderError(['`./local2` import', 'after', 'import of `global5`']),
        createOrderError(['`./local3` import', 'after', 'import of `global5`']),
        createOrderError(['`./local4` import', 'after', 'import of `global5`']),
      ],
    }),
    // reorder fix cannot cross function call on moving below
    tInvalid({
      code: `
        const local = require('./local');
        const global1 = require('global1');
        const global2 = require('global2');
        fn_call();
        const global3 = require('global3');

        fn_call();
      `,
      errors: [
        createOrderError(['`./local` import', 'after', 'import of `global3`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // reorder fix cannot cross function call on moving below
    // fix imports that not crosses function call only
    tInvalid({
      code: `
        const local1 = require('./local1');
        const global1 = require('global1');
        const global2 = require('global2');
        fn_call();
        const local2 = require('./local2');
        const global3 = require('global3');
        const global4 = require('global4');

        fn_call();
      `,
      output: `
        const local1 = require('./local1');
        const global1 = require('global1');
        const global2 = require('global2');
        fn_call();
        const global3 = require('global3');
        const global4 = require('global4');
        const local2 = require('./local2');

        fn_call();
      `,
      errors: [
        createOrderError(['`./local1` import', 'after', 'import of `global4`']),
        createOrderError(['`./local2` import', 'after', 'import of `global4`']),
      ],
    }),
    // pathGroup with position 'after'
    tInvalid({
      code: `
        import fs from 'fs';
        import _ from 'lodash';
        import { add } from './helper';
        import { Input } from '~/components/Input';
        `,
      output: `
        import fs from 'fs';
        import _ from 'lodash';
        import { Input } from '~/components/Input';
        import { add } from './helper';
        `,
      options: [
        {
          pathGroups: [
            { pattern: '~/**', group: 'external', position: 'after' },
          ],
        },
      ],
      errors: [
        createOrderError([
          '`~/components/Input` import',
          'before',
          'import of `./helper`',
        ]),
      ],
    }),
    // pathGroup without position
    tInvalid({
      code: `
        import fs from 'fs';
        import _ from 'lodash';
        import { add } from './helper';
        import { Input } from '~/components/Input';
        import async from 'async';
        `,
      output: `
        import fs from 'fs';
        import _ from 'lodash';
        import { Input } from '~/components/Input';
        import async from 'async';
        import { add } from './helper';
        `,
      options: [
        {
          pathGroups: [{ pattern: '~/**', group: 'external' }],
        },
      ],
      errors: [
        createOrderError(['`./helper` import', 'after', 'import of `async`']),
      ],
    }),
    // pathGroup with position 'before'
    tInvalid({
      code: `
        import fs from 'fs';
        import _ from 'lodash';
        import { add } from './helper';
        import { Input } from '~/components/Input';
        `,
      output: `
        import fs from 'fs';
        import { Input } from '~/components/Input';
        import _ from 'lodash';
        import { add } from './helper';
        `,
      options: [
        {
          pathGroups: [
            { pattern: '~/**', group: 'external', position: 'before' },
          ],
        },
      ],
      errors: [
        createOrderError([
          '`~/components/Input` import',
          'before',
          'import of `lodash`',
        ]),
      ],
    }),
    // multiple pathGroup with different positions for same group, fix for 'after'
    tInvalid({
      code: `
        import fs from 'fs';
        import { Import } from '$/components/Import';
        import _ from 'lodash';
        import { Output } from '~/components/Output';
        import { Input } from '#/components/Input';
        import { add } from './helper';
        import { Export } from '-/components/Export';
        `,
      output: `
        import fs from 'fs';
        import { Export } from '-/components/Export';
        import { Import } from '$/components/Import';
        import _ from 'lodash';
        import { Output } from '~/components/Output';
        import { Input } from '#/components/Input';
        import { add } from './helper';
        `,
      options: [
        {
          pathGroups: [
            { pattern: '~/**', group: 'external', position: 'after' },
            { pattern: '#/**', group: 'external', position: 'after' },
            { pattern: '-/**', group: 'external', position: 'before' },
            { pattern: '$/**', group: 'external', position: 'before' },
          ],
        },
      ],
      errors: [
        createOrderError([
          '`-/components/Export` import',
          'before',
          'import of `$/components/Import`',
        ]),
      ],
    }),

    // multiple pathGroup with different positions for same group, fix for 'before'
    tInvalid({
      code: `
        import fs from 'fs';
        import { Export } from '-/components/Export';
        import { Import } from '$/components/Import';
        import _ from 'lodash';
        import { Input } from '#/components/Input';
        import { add } from './helper';
        import { Output } from '~/components/Output';
        `,
      output: `
        import fs from 'fs';
        import { Export } from '-/components/Export';
        import { Import } from '$/components/Import';
        import _ from 'lodash';
        import { Output } from '~/components/Output';
        import { Input } from '#/components/Input';
        import { add } from './helper';
        `,
      options: [
        {
          pathGroups: [
            { pattern: '~/**', group: 'external', position: 'after' },
            { pattern: '#/**', group: 'external', position: 'after' },
            { pattern: '-/**', group: 'external', position: 'before' },
            { pattern: '$/**', group: 'external', position: 'before' },
          ],
        },
      ],
      errors: [
        createOrderError([
          '`~/components/Output` import',
          'before',
          'import of `#/components/Input`',
        ]),
      ],
    }),

    // pathGroups overflowing to previous/next groups
    tInvalid({
      code: `
        import path from 'path';
        import { namespace } from '@namespace';
        import { a } from 'a';
        import { b } from 'b';
        import { c } from 'c';
        import { d } from 'd';
        import { e } from 'e';
        import { f } from 'f';
        import { g } from 'g';
        import { h } from 'h';
        import { i } from 'i';
        import { j } from 'j';
        import { k } from 'k';`,
      output: `
        import path from 'path';

        import { namespace } from '@namespace';

        import { a } from 'a';

        import { b } from 'b';

        import { c } from 'c';

        import { d } from 'd';

        import { e } from 'e';

        import { f } from 'f';

        import { g } from 'g';

        import { h } from 'h';

        import { i } from 'i';

        import { j } from 'j';
        import { k } from 'k';`,
      options: [
        {
          groups: ['builtin', 'external', 'internal'],
          pathGroups: [
            { pattern: '@namespace', group: 'external', position: 'after' },
            { pattern: 'a', group: 'internal', position: 'before' },
            { pattern: 'b', group: 'internal', position: 'before' },
            { pattern: 'c', group: 'internal', position: 'before' },
            { pattern: 'd', group: 'internal', position: 'before' },
            { pattern: 'e', group: 'internal', position: 'before' },
            { pattern: 'f', group: 'internal', position: 'before' },
            { pattern: 'g', group: 'internal', position: 'before' },
            { pattern: 'h', group: 'internal', position: 'before' },
            { pattern: 'i', group: 'internal', position: 'before' },
          ],
          'newlines-between': 'always',
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      settings: {
        'import-x/internal-regex': String.raw`^(a|b|c|d|e|f|g|h|i|j|k)(\/|$)`,
      },
      errors: Array.from({ length: 11 }, () => ({
        messageId: 'oneLineBetweenGroups',
      })),
    }),

    // rankings that overflow to double-digit ranks
    tInvalid({
      code: `
        import external from 'external';
        import a from '@namespace/a';
        import b from '@namespace/b';
        import { parent } from '../../parent';
        import local from './local';
        import './side-effect';`,
      output: `
        import external from 'external';

        import a from '@namespace/a';
        import b from '@namespace/b';

        import { parent } from '../../parent';

        import local from './local';
        import './side-effect';`,
      options: [
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: [
            'type',
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
          ],
          'newlines-between': 'always',
          pathGroups: [
            { pattern: '@namespace', group: 'external', position: 'after' },
            { pattern: '@namespace/**', group: 'external', position: 'after' },
          ],
          // @ts-expect-error testing options
          pathGroupsExcludedImportTypes: ['@namespace'],
        },
      ],
      errors: [
        { messageId: 'oneLineBetweenGroups' },
        { messageId: 'oneLineBetweenGroups' },
        { messageId: 'oneLineBetweenGroups' },
      ],
    }),

    // reorder fix cannot cross non import or require
    tInvalid({
      code: `
        var async = require('async');
        fn_call();
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // reorder fix cannot cross function call on moving below (from #1252)
    tInvalid({
      code: `
        const env = require('./config');

        Object.keys(env);

        const http = require('http');
        const express = require('express');

        http.createServer(express());
      `,
      errors: [
        createOrderError(['`./config` import', 'after', 'import of `express`']),
      ],
    }),
    // reorder cannot cross non plain requires
    tInvalid({
      code: `
        var async = require('async');
        var a = require('./value.js')(a);
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // reorder fixes cannot be applied to non plain requires #1
    tInvalid({
      code: `
        var async = require('async');
        var fs = require('fs')(a);
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // reorder fixes cannot be applied to non plain requires #2
    tInvalid({
      code: `
        var async = require('async')(a);
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // cannot require in case of not assignment require
    tInvalid({
      code: `
        var async = require('async');
        require('./aa');
        var fs = require('fs');
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
    }),
    // reorder cannot cross function call (import statement)
    tInvalid({
      code: `
        import async from 'async';
        fn_call();
        import fs from 'fs';
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // reorder cannot cross variable assignment (import statement)
    tInvalid({
      code: `
        import async from 'async';
        var a = 1;
        import fs from 'fs';
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // reorder cannot cross non plain requires (import statement)
    tInvalid({
      code: `
        import async from 'async';
        var a = require('./value.js')(a);
        import fs from 'fs';
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // cannot reorder in case of not assignment import
    tInvalid({
      code: `
        import async from 'async';
        import './aa';
        import fs from 'fs';
      `,
      errors: [
        createOrderError(['`fs` import', 'before', 'import of `async`']),
      ],
    }),
    // Option alphabetize: {order: 'asc'}
    tInvalid({
      code: `
        import b from 'bar';
        import c from 'Bar';
        import a from 'foo';

        import index from './';
      `,
      output: `
        import c from 'Bar';
        import b from 'bar';
        import a from 'foo';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [createOrderError(['`Bar` import', 'before', 'import of `bar`'])],
    }),
    // Option alphabetize: {order: 'desc'}
    tInvalid({
      code: `
        import a from 'foo';
        import c from 'Bar';
        import b from 'bar';

        import index from './';
      `,
      output: `
        import a from 'foo';
        import b from 'bar';
        import c from 'Bar';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'desc' },
        },
      ],
      errors: [createOrderError(['`bar` import', 'before', 'import of `Bar`'])],
    }),
    // Option alphabetize: {order: 'asc'} and move nested import entries closer to the main import entry
    tInvalid({
      code: `
        import a from "foo";
        import b from "foo-bar";
        import c from "foo/bar";
        import d from "foo/barfoo";
      `,
      options: [
        {
          alphabetize: { order: 'asc' },
        },
      ],
      output: `
        import a from "foo";
        import c from "foo/bar";
        import d from "foo/barfoo";
        import b from "foo-bar";
      `,
      errors: [
        createOrderError([
          '`foo-bar` import',
          'after',
          'import of `foo/barfoo`',
        ]),
      ],
    }),
    // Option alphabetize {order: 'asc': caseInsensitive: true}
    tInvalid({
      code: `
        import b from 'foo';
        import a from 'Bar';

        import index from './';
      `,
      output: `
        import a from 'Bar';
        import b from 'foo';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      errors: [createOrderError(['`Bar` import', 'before', 'import of `foo`'])],
    }),
    // Option alphabetize {order: 'desc': caseInsensitive: true}
    tInvalid({
      code: `
        import a from 'Bar';
        import b from 'foo';

        import index from './';
      `,
      output: `
        import b from 'foo';
        import a from 'Bar';

        import index from './';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'desc', caseInsensitive: true },
        },
      ],
      errors: [createOrderError(['`foo` import', 'before', 'import of `Bar`'])],
    }),
    // Option alphabetize {order: 'asc'} and require with member expression
    tInvalid({
      code: `
        const b = require('./b').get();
        const a = require('./a');
      `,
      output: `
        const a = require('./a');
        const b = require('./b').get();
      `,
      options: [
        {
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [createOrderError(['`./a` import', 'before', 'import of `./b`'])],
    }),
    // Alphabetize with parent paths
    tInvalid({
      code: `
        import a from '../a';
        import p from '..';
      `,
      output: `
        import p from '..';
        import a from '../a';
      `,
      options: [
        {
          groups: ['external', 'index'],
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [createOrderError(['`..` import', 'before', 'import of `../a`'])],
    }),
    // Option pathGroup[].distinctGroup: 'false' should error when newlines are incorrect 2
    tInvalid({
      code: `
        import A from 'a';
        import C from './c';
      `,
      output: `
        import A from 'a';

        import C from './c';
      `,
      options: [
        {
          'newlines-between': 'always',
          distinctGroup: false,
          pathGroupsExcludedImportTypes: [],
        },
      ],
      errors: [{ messageId: 'oneLineBetweenGroups' }],
    }),
    // Option pathGroup[].distinctGroup: 'false' should error when newlines are incorrect 2
    tInvalid({
      code: `
        import A from 'a';

        import C from 'c';
      `,
      output: `
        import A from 'a';
        import C from 'c';
      `,
      options: [
        {
          'newlines-between': 'always',
          distinctGroup: false,
          pathGroupsExcludedImportTypes: [],
          pathGroups: [
            {
              pattern: 'a',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'c',
              group: 'external',
              position: 'after',
            },
          ],
        },
      ],
      errors: [{ messageId: 'noLineWithinGroup' }],
    }),
    // Alphabetize with require
    tInvalid({
      code: `
          const { cello } = require('./cello');
          import { int } from './int';
          const blah = require('./blah');
          import { hello } from './hello';
        `,
      output: [
        `
          import { int } from './int';
          const { cello } = require('./cello');
          const blah = require('./blah');
          import { hello } from './hello';
        `,
        `
          import { int } from './int';
          import { hello } from './hello';
          const { cello } = require('./cello');
          const blah = require('./blah');
        `,
      ],
      errors: [
        createOrderError(['`./int` import', 'before', 'import of `./cello`']),
        createOrderError(['`./hello` import', 'before', 'import of `./cello`']),
      ],
    }),
    // named import order
    tInvalid({
      code: `
        var { B, A: R } = require("./Z");
        import { O as G, D } from "./Z";
        import { K, L, J } from "./Z";
        export { Z, X, Y } from "./Z";
      `,
      output: `
        var { A: R, B } = require("./Z");
        import { D, O as G } from "./Z";
        import { J, K, L } from "./Z";
        export { X, Y, Z } from "./Z";
      `,
      options: [
        {
          named: true,
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [
        createOrderError(['`A` import', 'before', 'import of `B`']),
        createOrderError(['`D` import', 'before', 'import of `O`']),
        createOrderError(['`J` import', 'before', 'import of `K`']),
        createOrderError(['`Z` export', 'after', 'export of `Y`']),
      ],
    }),
    tInvalid({
      code: `
        import { D, C } from "./Z";
        var { B, A } = require("./Z");
        export { B, A };
      `,
      output: `
        import { C, D } from "./Z";
        var { B, A } = require("./Z");
        export { A, B };
      `,
      options: [
        {
          named: {
            require: false,
            import: true,
            export: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [
        createOrderError(['`C` import', 'before', 'import of `D`']),
        createOrderError(['`A` export', 'before', 'export of `B`']),
      ],
    }),
    tInvalid({
      code: `
        import { A as B, A as C, A } from "./Z";
        export { A, A as D, A as B, A as C } from "./Z";
        const { a: b, a: c, a } = require("./Z");
      `,
      output: `
        import { A, A as B, A as C } from "./Z";
        export { A, A as B, A as C, A as D } from "./Z";
        const { a, a: b, a: c } = require("./Z");
      `,
      options: [
        {
          named: true,
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [
        createOrderError(['`A` import', 'before', 'import of `A as B`']),
        createOrderError(['`A as D` export', 'after', 'export of `A as C`']),
        createOrderError(['`a` import', 'before', 'import of `a as b`']),
      ],
    }),
    tInvalid({
      code: `
        import { A, B, C } from "./Z";
        exports = { B, C, A };
        module.exports = { c: C, a: A, b: B };
      `,
      output: `
        import { A, B, C } from "./Z";
        exports = { A, B, C };
        module.exports = { a: A, b: B, c: C };
      `,
      options: [
        {
          named: {
            cjsExports: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [
        createOrderError(['`A` export', 'before', 'export of `B`']),
        createOrderError(['`c` export', 'after', 'export of `b`']),
      ],
    }),
    tInvalid({
      code: `
        exports.B = { };
        module.exports.A = { };
        module.exports.C = { };
      `,
      output: `
        module.exports.A = { };
        exports.B = { };
        module.exports.C = { };
      `,
      options: [
        {
          named: {
            cjsExports: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [createOrderError(['`A` export', 'before', 'export of `B`'])],
    }),
    tInvalid({
      code: `
        exports.A.C = { };
        module.exports.A.A = { };
        exports.A.B = { };
      `,
      output: `
        module.exports.A.A = { };
        exports.A.B = { };
        exports.A.C = { };
      `,
      options: [
        {
          named: {
            cjsExports: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [createOrderError(['`A.C` export', 'after', 'export of `A.B`'])],
    }),
    // multi-line named specifiers & trailing commas
    tInvalid({
      code: `
        const {
          F: O,
          O: B,
          /* Hello World */
          A: R
        } = require("./Z");
        import {
          Y,
          X,
        } from "./Z";
        export {
          Z, A,
          B
        } from "./Z";
        module.exports = {
          a: A, o: O,
          b: B
        };
      `,
      output: `
        const {
          /* Hello World */
          A: R,
          F: O,
          O: B
        } = require("./Z");
        import {
          X,
          Y,
        } from "./Z";
        export { A,
          B,
          Z
        } from "./Z";
        module.exports = {
          a: A,
          b: B, o: O
        };
      `,
      options: [
        {
          named: {
            enabled: true,
          },
          alphabetize: { order: 'asc' },
        },
      ],
      errors: [
        createOrderError(['`A` import', 'before', 'import of `F`']),
        createOrderError(['`X` import', 'before', 'import of `Y`']),
        createOrderError(['`Z` export', 'after', 'export of `B`']),
        createOrderError(['`b` export', 'before', 'export of `o`']),
      ],
    }),
  ],
})

describe('TypeScript', () => {
  for (const parser of getNonDefaultParsers()) {
    const supportsExportTypeSpecifiers = parser === parsers.TS
    const parserConfig = {
      languageOptions: {
        ...(parser === parsers.BABEL && {
          parser: require<TSESLint.Parser.LooseParserModule>(parsers.BABEL),
        }),
      },
      settings: {
        'import-x/parsers': { [parsers.TS]: ['.ts'] },
        'import-x/resolver': { 'eslint-import-resolver-typescript': true },
      },
    }

    ruleTester.run('order', rule, {
      valid: [
        // #1667: typescript type import support

        // Option alphabetize: {order: 'asc'}
        tValid({
          code: `
              import c from 'Bar';
              import type { C } from 'Bar';
              import b from 'bar';
              import a from 'foo';
              import type { A } from 'foo';

              import index from './';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index'],
              alphabetize: { order: 'asc' },
            },
          ],
        }),
        // Option alphabetize: {order: 'desc'}
        tValid({
          code: `
              import a from 'foo';
              import type { A } from 'foo';
              import b from 'bar';
              import c from 'Bar';
              import type { C } from 'Bar';

              import index from './';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index'],
              alphabetize: { order: 'desc' },
            },
          ],
        }),
        // Option alphabetize: {order: 'asc'} with type group
        tValid({
          code: `
              import c from 'Bar';
              import b from 'bar';
              import a from 'foo';

              import index from './';

              import type { C } from 'Bar';
              import type { A } from 'foo';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index', 'type'],
              alphabetize: { order: 'asc' },
            },
          ],
        }),
        // Option alphabetize: {order: 'asc'} with type group & path group
        tValid({
          // only: true,
          code: `
              import c from 'Bar';
              import a from 'foo';

              import b from 'dirA/bar';

              import index from './';

              import type { C } from 'dirA/Bar';
              import type { A } from 'foo';
            `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: ['type'],
            },
          ],
        }),
        // Option alphabetize: {order: 'asc'} with path group
        tValid({
          // only: true,
          code: `
              import c from 'Bar';
              import type { A } from 'foo';
              import a from 'foo';

              import type { C } from 'dirA/Bar';
              import b from 'dirA/bar';

              import index from './';
            `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: [],
            },
          ],
        }),
        // Option alphabetize: {order: 'desc'} with type group
        tValid({
          code: `
              import a from 'foo';
              import b from 'bar';
              import c from 'Bar';

              import index from './';

              import type { A } from 'foo';
              import type { C } from 'Bar';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index', 'type'],
              alphabetize: { order: 'desc' },
            },
          ],
        }),
        tValid({
          code: `
              import { Partner } from '@models/partner/partner';
              import { PartnerId } from '@models/partner/partner-id';
            `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
            },
          ],
        }),
        tValid({
          code: `
              import { serialize, parse, mapFieldErrors } from '@vtaits/form-schema';
              import type { GetFieldSchema } from '@vtaits/form-schema';
              import { useMemo, useCallback } from 'react';
              import type { ReactElement, ReactNode } from 'react';
              import { Form } from 'react-final-form';
              import type { FormProps as FinalFormProps } from 'react-final-form';
            `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
            },
          ],
        }),
        // Imports inside module declaration
        tValid({
          code: `
              import type { CopyOptions } from 'fs';
              import type { ParsedPath } from 'path';

              declare module 'my-module' {
                import type { CopyOptions } from 'fs';
                import type { ParsedPath } from 'path';
              }
            `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
            },
          ],
        }),
        tValid({
          code: `
              import { useLazyQuery, useQuery } from "@apollo/client";
              import { useEffect } from "react";
            `,
          options: [
            {
              groups: [
                'builtin',
                'external',
                'internal',
                'parent',
                'sibling',
                'index',
                'object',
                'type',
              ],
              pathGroups: [
                {
                  pattern: 'react',
                  group: 'external',
                  position: 'before',
                },
              ],
              'newlines-between': 'always',
              alphabetize: {
                order: 'asc',
                caseInsensitive: true,
              },
            },
          ],
        }),
        tValid({
          code: `
          import express from 'express';
          import log4js from 'log4js';
          import chpro from 'node:child_process';
          // import fsp from 'node:fs/promises';
        `,
          options: [
            {
              groups: [
                [
                  'builtin',
                  'external',
                  'internal',
                  'parent',
                  'sibling',
                  'index',
                  'object',
                  'type',
                ],
              ],
            },
          ],
        }),
        // Option sortTypesGroup: false (default)
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';

            import type { C } from 'dirA/Bar';
            import b from 'dirA/bar';
            import type { D } from 'dirA/bar';

            import index from './';

            import type { AA } from 'abc';
            import type { A } from 'foo';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: [],
            },
          ],
        }),
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';

            import type { C } from 'dirA/Bar';
            import b from 'dirA/bar';
            import type { D } from 'dirA/bar';

            import index from './';

            import type { AA } from 'abc';
            import type { A } from 'foo';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: false,
            },
          ],
        }),
        // Option sortTypesGroup: true and 'type' in pathGroupsExcludedImportTypes
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';

            import b from 'dirA/bar';

            import index from './';

            import type { AA } from 'abc';
            import type { C } from 'dirA/Bar';
            import type { D } from 'dirA/bar';
            import type { A } from 'foo';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: ['type'],
              sortTypesGroup: true,
            },
          ],
        }),
        // Option sortTypesGroup: true and 'type' omitted from groups
        tValid({
          code: `
            import c from 'Bar';
            import type { AA } from 'abc';
            import a from 'foo';
            import type { A } from 'foo';

            import type { C } from 'dirA/Bar';
            import b from 'dirA/bar';
            import type { D } from 'dirA/bar';

            import index from './';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: [],
              // Becomes a no-op without "type" in groups
              sortTypesGroup: true,
            },
          ],
        }),
        tValid({
          code: `
            import c from 'Bar';
            import type { AA } from 'abc';
            import a from 'foo';
            import type { A } from 'foo';

            import type { C } from 'dirA/Bar';
            import b from 'dirA/bar';
            import type { D } from 'dirA/bar';

            import index from './';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: [],
            },
          ],
        }),
        // Option sortTypesGroup: true and newlines-between-types defaults to the value of newlines-between
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';

            import b from 'dirA/bar';

            import index from './';

            import type { AA } from 'abc';
            import type { A } from 'foo';

            import type { C } from 'dirA/Bar';
            import type { D } from 'dirA/bar';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
            },
          ],
        }),
        // Option: sortTypesGroup: true and newlines-between-types: 'always' (takes precedence over newlines-between between type-only and normal imports)
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';
            import b from 'dirA/bar';
            import index from './';

            import type { AA } from 'abc';
            import type { A } from 'foo';

            import type { C } from 'dirA/Bar';
            import type { D } from 'dirA/bar';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'never',
              'newlines-between-types': 'always',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
            },
          ],
        }),
        // Option: sortTypesGroup: true and newlines-between-types: 'never' (takes precedence over newlines-between between type-only and normal imports)
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';

            import b from 'dirA/bar';

            import index from './';
            import type { AA } from 'abc';
            import type { A } from 'foo';
            import type { C } from 'dirA/Bar';
            import type { D } from 'dirA/bar';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always',
              'newlines-between-types': 'never',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
            },
          ],
        }),
        // Option: sortTypesGroup: true and newlines-between-types: 'ignore'
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';
            import b from 'dirA/bar';
            import index from './';
            import type { AA } from 'abc';

            import type { A } from 'foo';
            import type { C } from 'dirA/Bar';
            import type { D } from 'dirA/bar';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'never',
              'newlines-between-types': 'ignore',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
            },
          ],
        }),
        // Option: sortTypesGroup: true and newlines-between-types: 'always-and-inside-groups'
        tValid({
          code: `
            import c from 'Bar';
            import a from 'foo';
            import b from 'dirA/bar';
            import index from './';

            import type { AA } from 'abc';

            import type { A } from 'foo';

            import type { C } from 'dirA/Bar';

            import type { D } from 'dirA/bar';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'never',
              'newlines-between-types': 'always-and-inside-groups',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
            },
          ],
        }),
        // Option: sortTypesGroup: true puts type imports in the same order as regular imports (from issue #2441, PR #2615)
        tValid({
          code: `
            import type A from "fs";
            import type B from "path";
            import type C from "../foo.js";
            import type D from "./bar.js";
            import type E from './';

            import a from "fs";
            import b from "path";
            import c from "../foo.js";
            import d from "./bar.js";
            import e from "./";
          `,
          ...parserConfig,
          options: [
            {
              groups: ['type', 'builtin', 'parent', 'sibling', 'index'],
              alphabetize: {
                order: 'asc',
                caseInsensitive: true,
              },
              sortTypesGroup: true,
            },
          ],
        }),
        // Options: sortTypesGroup + newlines-between-types example #1 from the documentation (pass)
        tValid({
          code: `
            import type A from "fs";
            import type B from "path";
            import type C from "../foo.js";
            import type D from "./bar.js";
            import type E from './';

            import a from "fs";
            import b from "path";

            import c from "../foo.js";

            import d from "./bar.js";

            import e from "./";
          `,
          ...parserConfig,
          options: [
            {
              groups: ['type', 'builtin', 'parent', 'sibling', 'index'],
              sortTypesGroup: true,
              'newlines-between': 'always',
              'newlines-between-types': 'ignore',
            },
          ],
        }),
        // Options: sortTypesGroup + newlines-between-types example #2 from the documentation (pass)
        tValid({
          code: `
            import type A from "fs";
            import type B from "path";

            import type C from "../foo.js";

            import type D from "./bar.js";

            import type E from './';

            import a from "fs";
            import b from "path";
            import c from "../foo.js";
            import d from "./bar.js";
            import e from "./";
          `,
          ...parserConfig,
          options: [
            {
              groups: ['type', 'builtin', 'parent', 'sibling', 'index'],
              sortTypesGroup: true,
              'newlines-between': 'never',
              'newlines-between-types': 'always',
            },
          ],
        }),
        // Ensure the rule doesn't choke and die on absolute paths trying to pass NaN around
        tValid({
          code: `
            import fs from 'fs';

            import '@scoped/package';
            import type { B } from 'fs';

            import type { A1 } from '/bad/bad/bad/bad';
            import './a/b/c';
            import type { A2 } from '/bad/bad/bad/bad';
            import type { A3 } from '/bad/bad/bad/bad';
            import type { D1 } from '/bad/bad/not/good';
            import type { D2 } from '/bad/bad/not/good';
            import type { D3 } from '/bad/bad/not/good';

            import type { C } from '@something/else';

            import type { E } from './index.js';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['builtin', 'type', 'unknown', 'external'],
              sortTypesGroup: true,
              'newlines-between': 'always',
            },
          ],
        }),
        // Ensure the rule doesn't choke and die when right-hand-side AssignmentExpression properties lack a "key" attribute (e.g. SpreadElement)
        tValid({
          code: `
            // https://prettier.io/docs/en/options.html

            module.exports = {
                ...require('@xxxx/.prettierrc.js'),
            };
          `,
          ...parserConfig,
          options: [{ named: { enabled: true } }],
        }),
        // Option: sortTypesGroup: true and newlines-between-types: 'always-and-inside-groups' and consolidateIslands: 'inside-groups'
        tValid({
          code: `
            import c from 'Bar';
            import d from 'bar';

            import {
              aa,
              bb,
              cc,
              dd,
              ee,
              ff,
              gg
            } from 'baz';

            import {
              hh,
              ii,
              jj,
              kk,
              ll,
              mm,
              nn
            } from 'fizz';

            import a from 'foo';

            import b from 'dirA/bar';

            import index from './';

            import type { AA,
              BB, CC } from 'abc';

            import type { Z } from 'fizz';

            import type {
              A,
              B
            } from 'foo';

            import type { C2 } from 'dirB/Bar';

            import type {
              D2,
              X2,
              Y2
            } from 'dirB/bar';

            import type { E2 } from 'dirB/baz';

            import type { C3 } from 'dirC/Bar';

            import type {
              D3,
              X3,
              Y3
            } from 'dirC/bar';

            import type { E3 } from 'dirC/baz';
            import type { F3 } from 'dirC/caz';

            import type { C1 } from 'dirA/Bar';

            import type {
              D1,
              X1,
              Y1
            } from 'dirA/bar';

            import type { E1 } from 'dirA/baz';

            import type { F } from './index.js';

            import type { G } from './aaa.js';
            import type { H } from './bbb';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                  position: 'after',
                },
                {
                  pattern: 'dirB/**',
                  group: 'internal',
                  position: 'before',
                },
                {
                  pattern: 'dirC/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always-and-inside-groups',
              'newlines-between-types': 'always-and-inside-groups',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
              consolidateIslands: 'inside-groups',
            },
          ],
        }),
        // Option: sortTypesGroup: true and newlines-between-types: 'always-and-inside-groups' and consolidateIslands: 'never' (default)
        tValid({
          code: `
            import c from 'Bar';
            import d from 'bar';

            import {
              aa,
              bb,
              cc,
              dd,
              ee,
              ff,
              gg
            } from 'baz';

            import {
              hh,
              ii,
              jj,
              kk,
              ll,
              mm,
              nn
            } from 'fizz';

            import a from 'foo';

            import b from 'dirA/bar';

            import index from './';

            import type { AA,
              BB, CC } from 'abc';

            import type { Z } from 'fizz';

            import type {
              A,
              B
            } from 'foo';

            import type { C2 } from 'dirB/Bar';

            import type {
              D2,
              X2,
              Y2
            } from 'dirB/bar';

            import type { E2 } from 'dirB/baz';

            import type { C3 } from 'dirC/Bar';

            import type {
              D3,
              X3,
              Y3
            } from 'dirC/bar';

            import type { E3 } from 'dirC/baz';
            import type { F3 } from 'dirC/caz';

            import type { C1 } from 'dirA/Bar';

            import type {
              D1,
              X1,
              Y1
            } from 'dirA/bar';

            import type { E1 } from 'dirA/baz';

            import type { F } from './index.js';

            import type { G } from './aaa.js';
            import type { H } from './bbb';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                  position: 'after',
                },
                {
                  pattern: 'dirB/**',
                  group: 'internal',
                  position: 'before',
                },
                {
                  pattern: 'dirC/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always-and-inside-groups',
              'newlines-between-types': 'always-and-inside-groups',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
              consolidateIslands: 'never',
            },
          ],
        }),
        // Ensure consolidateIslands: 'inside-groups', newlines-between: 'always-and-inside-groups', and newlines-between-types: 'never' do not fight for dominance
        tValid({
          code: `
            import makeVanillaYargs from 'yargs/yargs';

            import { createDebugLogger } from 'multiverse+rejoinder';

            import { globalDebuggerNamespace } from 'rootverse+bfe:src/constant.ts';
            import { ErrorMessage, type KeyValueEntry } from 'rootverse+bfe:src/error.ts';

            import {
              $artificiallyInvoked,
              $canonical,
              $exists,
              $genesis
            } from 'rootverse+bfe:src/symbols.ts';

            import type {
              Entries,
              LiteralUnion,
              OmitIndexSignature,
              Promisable,
              StringKeyOf
            } from 'type-fest';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: {
                order: 'asc',
                orderImportKind: 'asc',
                caseInsensitive: true,
              },
              named: {
                enabled: true,
                types: 'types-last',
              },
              groups: [
                'builtin',
                'external',
                'internal',
                ['parent', 'sibling', 'index'],
                ['object', 'type'],
              ],
              pathGroups: [
                {
                  pattern: 'multiverse{*,*/**}',
                  group: 'external',
                  position: 'after',
                },
                {
                  pattern: 'rootverse{*,*/**}',
                  group: 'external',
                  position: 'after',
                },
                {
                  pattern: 'universe{*,*/**}',
                  group: 'external',
                  position: 'after',
                },
              ],
              distinctGroup: true,
              pathGroupsExcludedImportTypes: ['builtin', 'object'],
              'newlines-between': 'always-and-inside-groups',
              'newlines-between-types': 'never',
              sortTypesGroup: true,
              consolidateIslands: 'inside-groups',
            },
          ],
        }),
        // Ensure consolidateIslands: 'inside-groups', newlines-between: 'never', and newlines-between-types: 'always-and-inside-groups' do not fight for dominance
        tValid({
          code: `
            import makeVanillaYargs from 'yargs/yargs';
            import { createDebugLogger } from 'multiverse+rejoinder';
            import { globalDebuggerNamespace } from 'rootverse+bfe:src/constant.ts';
            import { ErrorMessage, type KeyValueEntry } from 'rootverse+bfe:src/error.ts';
            import { $artificiallyInvoked } from 'rootverse+bfe:src/symbols.ts';

            import type {
              Entries,
              LiteralUnion,
              OmitIndexSignature,
              Promisable,
              StringKeyOf
            } from 'type-fest';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: {
                order: 'asc',
                orderImportKind: 'asc',
                caseInsensitive: true,
              },
              named: {
                enabled: true,
                types: 'types-last',
              },
              groups: [
                'builtin',
                'external',
                'internal',
                ['parent', 'sibling', 'index'],
                ['object', 'type'],
              ],
              pathGroups: [
                {
                  pattern: 'multiverse{*,*/**}',
                  group: 'external',
                  position: 'after',
                },
                {
                  pattern: 'rootverse{*,*/**}',
                  group: 'external',
                  position: 'after',
                },
                {
                  pattern: 'universe{*,*/**}',
                  group: 'external',
                  position: 'after',
                },
              ],
              distinctGroup: true,
              pathGroupsExcludedImportTypes: ['builtin', 'object'],
              'newlines-between': 'never',
              'newlines-between-types': 'always-and-inside-groups',
              sortTypesGroup: true,
              consolidateIslands: 'inside-groups',
            },
          ],
        }),
        tValid({
          code: `
            import c from 'Bar';
            import d from 'bar';

            import {
              aa,
              bb,
              cc,
              dd,
              ee,
              ff,
              gg
            } from 'baz';

            import {
              hh,
              ii,
              jj,
              kk,
              ll,
              mm,
              nn
            } from 'fizz';

            import a from 'foo';
            import b from 'dirA/bar';
            import index from './';

            import type { AA,
              BB, CC } from 'abc';

            import type { Z } from 'fizz';

            import type {
              A,
              B
            } from 'foo';

            import type { C2 } from 'dirB/Bar';

            import type {
              D2,
              X2,
              Y2
            } from 'dirB/bar';

            import type { E2 } from 'dirB/baz';

            import type { C3 } from 'dirC/Bar';

            import type {
              D3,
              X3,
              Y3
            } from 'dirC/bar';

            import type { E3 } from 'dirC/baz';
            import type { F3 } from 'dirC/caz';

            import type { C1 } from 'dirA/Bar';

            import type {
              D1,
              X1,
              Y1
            } from 'dirA/bar';

            import type { E1 } from 'dirA/baz';

            import type { F } from './index.js';

            import type { G } from './aaa.js';
            import type { H } from './bbb';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                  position: 'after',
                },
                {
                  pattern: 'dirB/**',
                  group: 'internal',
                  position: 'before',
                },
                {
                  pattern: 'dirC/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'never',
              'newlines-between-types': 'always-and-inside-groups',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
              consolidateIslands: 'inside-groups',
            },
          ],
        }),
        tValid({
          code: `
            import assert from 'assert';
            import { isNativeError } from 'util/types';

            import { runNoRejectOnBadExit } from '@-xun/run';
            import { TrialError } from 'named-app-errors';
            import { resolve as resolverLibrary } from 'resolve.exports';

            import { toAbsolutePath, type AbsolutePath } from 'rootverse+project-utils:src/fs.ts';

            import type { PackageJson } from 'type-fest';
            // Some comment about remembering to do something
            import type { XPackageJson } from 'rootverse:src/assets/config/_package.json.ts';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: {
                order: 'asc',
                orderImportKind: 'asc',
                caseInsensitive: true,
              },
              named: {
                enabled: true,
                types: 'types-last',
              },
              groups: [
                'builtin',
                'external',
                'internal',
                ['parent', 'sibling', 'index'],
                ['object', 'type'],
              ],
              pathGroups: [
                {
                  pattern: 'rootverse{*,*/**}',
                  group: 'external',
                  position: 'after',
                },
              ],
              distinctGroup: true,
              pathGroupsExcludedImportTypes: ['builtin', 'object'],
              'newlines-between': 'always-and-inside-groups',
              'newlines-between-types': 'never',
              sortTypesGroup: true,
              consolidateIslands: 'inside-groups',
            },
          ],
        }),

        // Documentation passing example #1 for newlines-between
        tValid({
          code: `
            import fs from 'fs';
            import path from 'path';

            import sibling from './foo';

            import index from './';
          `,
          ...parserConfig,
          options: [
            {
              'newlines-between': 'always',
            },
          ],
        }),
        // Documentation passing example #2 for newlines-between
        tValid({
          code: `
            import fs from 'fs';

            import path from 'path';

            import sibling from './foo';

            import index from './';
          `,
          ...parserConfig,
          options: [
            {
              'newlines-between': 'always-and-inside-groups',
            },
          ],
        }),
        // Documentation passing example #3 for newlines-between
        tValid({
          code: `
            import fs from 'fs';
            import path from 'path';
            import sibling from './foo';
            import index from './';
          `,
          ...parserConfig,
          options: [
            {
              'newlines-between': 'never',
            },
          ],
        }),
        // Documentation passing example #1 for alphabetize
        tValid({
          code: `
            import blist2 from 'blist';
            import blist from 'BList';
            import * as classnames from 'classnames';
            import aTypes from 'prop-types';
            import React, { PureComponent } from 'react';
            import { compose, apply } from 'xcompose';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: {
                order: 'asc',
                caseInsensitive: true,
              },
            },
          ],
        }),
        // (not an example, but we also test caseInsensitive: false for completeness)
        tValid({
          code: `
            import blist from 'BList';
            import blist2 from 'blist';
            import * as classnames from 'classnames';
            import aTypes from 'prop-types';
            import React, { PureComponent } from 'react';
            import { compose, apply } from 'xcompose';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: {
                order: 'asc',
                caseInsensitive: false,
              },
            },
          ],
        }),
        // Documentation passing example #1 for named
        tValid({
          code: `
            import { apply, compose } from 'xcompose';
          `,
          ...parserConfig,
          options: [
            {
              named: true,
              alphabetize: {
                order: 'asc',
              },
            },
          ],
        }),
        // Documentation passing example #1 for warnOnUnassignedImports
        tValid({
          code: `
            import fs from 'fs';
            import path from 'path';
            import './styles.css';
          `,
          ...parserConfig,
          options: [
            {
              warnOnUnassignedImports: true,
            },
          ],
        }),
        // Documentation passing example #1 for sortTypesGroup
        tValid({
          code: `
            import type A from "fs";
            import type B from "path";
            import type C from "../foo.js";
            import type D from "./bar.js";
            import type E from './';

            import a from "fs";
            import b from "path";
            import c from "../foo.js";
            import d from "./bar.js";
            import e from "./";
          `,
          ...parserConfig,
          options: [
            {
              groups: ['type', 'builtin', 'parent', 'sibling', 'index'],
              alphabetize: { order: 'asc' },
              sortTypesGroup: true,
            },
          ],
        }),
        // (not an example, but we also test the reverse for completeness)
        tValid({
          code: `
            import a from "fs";
            import b from "path";
            import c from "../foo.js";
            import d from "./bar.js";
            import e from "./";

            import type A from "fs";
            import type B from "path";
            import type C from "../foo.js";
            import type D from "./bar.js";
            import type E from './';
          `,
          ...parserConfig,
          options: [
            {
              groups: ['builtin', 'parent', 'sibling', 'index', 'type'],
              sortTypesGroup: true,
            },
          ],
        }),
        // (not an example, but we also test the reverse for completeness)
        tValid({
          code: `
            import a from "fs";
            import b from "path";

            import c from "../foo.js";

            import d from "./bar.js";

            import e from "./";

            import type A from "fs";
            import type B from "path";
            import type C from "../foo.js";
            import type D from "./bar.js";
            import type E from './';
          `,
          ...parserConfig,
          options: [
            {
              groups: ['builtin', 'parent', 'sibling', 'index', 'type'],
              sortTypesGroup: true,
              'newlines-between': 'always',
              'newlines-between-types': 'ignore',
            },
          ],
        }),
        // (not an example, but we also test the reverse for completeness)
        tValid({
          code: `
            import a from "fs";
            import b from "path";
            import c from "../foo.js";
            import d from "./bar.js";
            import e from "./";

            import type A from "fs";
            import type B from "path";

            import type C from "../foo.js";

            import type D from "./bar.js";

            import type E from './';
          `,
          ...parserConfig,
          options: [
            {
              groups: ['builtin', 'parent', 'sibling', 'index', 'type'],
              sortTypesGroup: true,
              'newlines-between': 'never',
              'newlines-between-types': 'always',
            },
          ],
        }),
        // Documentation passing example #1 for consolidateIslands
        tValid({
          code: `
            var fs = require('fs');
            var path = require('path');
            var { util1, util2, util3 } = require('util');

            var async = require('async');

            var relParent1 = require('../foo');

            var {
              relParent21,
              relParent22,
              relParent23,
              relParent24,
            } = require('../');

            var relParent3 = require('../bar');

            var { sibling1,
              sibling2, sibling3 } = require('./foo');

            var sibling2 = require('./bar');
            var sibling3 = require('./foobar');
          `,
          ...parserConfig,
          options: [
            {
              'newlines-between': 'always-and-inside-groups',
              consolidateIslands: 'inside-groups',
            },
          ],
        }),
        // Documentation passing example #2 for consolidateIslands
        tValid({
          code: `
            import c from 'Bar';
            import d from 'bar';

            import {
              aa,
              bb,
              cc,
              dd,
              ee,
              ff,
              gg
            } from 'baz';

            import {
              hh,
              ii,
              jj,
              kk,
              ll,
              mm,
              nn
            } from 'fizz';

            import a from 'foo';

            import b from 'dirA/bar';

            import index from './';

            import type { AA,
              BB, CC } from 'abc';

            import type { Z } from 'fizz';

            import type {
              A,
              B
            } from 'foo';

            import type { C2 } from 'dirB/Bar';

            import type {
              D2,
              X2,
              Y2
            } from 'dirB/bar';

            import type { E2 } from 'dirB/baz';
            import type { C3 } from 'dirC/Bar';

            import type {
              D3,
              X3,
              Y3
            } from 'dirC/bar';

            import type { E3 } from 'dirC/baz';
            import type { F3 } from 'dirC/caz';
            import type { C1 } from 'dirA/Bar';

            import type {
              D1,
              X1,
              Y1
            } from 'dirA/bar';

            import type { E1 } from 'dirA/baz';
            import type { F } from './index.js';
            import type { G } from './aaa.js';
            import type { H } from './bbb';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['external', 'internal', 'index', 'type'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                  position: 'after',
                },
                {
                  pattern: 'dirB/**',
                  group: 'internal',
                  position: 'before',
                },
                {
                  pattern: 'dirC/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always-and-inside-groups',
              'newlines-between-types': 'never',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
              consolidateIslands: 'inside-groups',
            },
          ],
        }),
        // (not an example, but we also test the reverse for completeness)
        tValid({
          code: `
            import type { AA,
              BB, CC } from 'abc';

            import type { Z } from 'fizz';

            import type {
              A,
              B
            } from 'foo';

            import type { C2 } from 'dirB/Bar';

            import type {
              D2,
              X2,
              Y2
            } from 'dirB/bar';

            import type { E2 } from 'dirB/baz';
            import type { C3 } from 'dirC/Bar';

            import type {
              D3,
              X3,
              Y3
            } from 'dirC/bar';

            import type { E3 } from 'dirC/baz';
            import type { F3 } from 'dirC/caz';
            import type { C1 } from 'dirA/Bar';

            import type {
              D1,
              X1,
              Y1
            } from 'dirA/bar';

            import type { E1 } from 'dirA/baz';
            import type { F } from './index.js';
            import type { G } from './aaa.js';
            import type { H } from './bbb';

            import c from 'Bar';
            import d from 'bar';

            import {
              aa,
              bb,
              cc,
              dd,
              ee,
              ff,
              gg
            } from 'baz';

            import {
              hh,
              ii,
              jj,
              kk,
              ll,
              mm,
              nn
            } from 'fizz';

            import a from 'foo';

            import b from 'dirA/bar';

            import index from './';
          `,
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
              groups: ['type', 'external', 'internal', 'index'],
              pathGroups: [
                {
                  pattern: 'dirA/**',
                  group: 'internal',
                  position: 'after',
                },
                {
                  pattern: 'dirB/**',
                  group: 'internal',
                  position: 'before',
                },
                {
                  pattern: 'dirC/**',
                  group: 'internal',
                },
              ],
              'newlines-between': 'always-and-inside-groups',
              'newlines-between-types': 'never',
              pathGroupsExcludedImportTypes: [],
              sortTypesGroup: true,
              consolidateIslands: 'inside-groups',
            },
          ],
        }),
        // By default it should order same as TS LSP (issue-286)
        tValid({
          code: `import { internA } from "#a";
import { scopeA } from "@a/a";
import fs from 'node:fs';
import path from "path";
import { localA } from "./a";
`,
          ...parserConfig,
          options: [
            {
              privateImportsFeatureFlag: true,
            },
          ],
        }),
      ],
      invalid: [
        // Option alphabetize: {order: 'asc'}
        tInvalid({
          code: `
              import b from 'bar';
              import c from 'Bar';
              import type { C } from 'Bar';
              import a from 'foo';
              import type { A } from 'foo';

              import index from './';
            `,
          output: `
              import c from 'Bar';
              import type { C } from 'Bar';
              import b from 'bar';
              import a from 'foo';
              import type { A } from 'foo';

              import index from './';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index'],
              alphabetize: { order: 'asc' },
            },
          ],
          errors: [
            createOrderError(['`bar` import', 'after', 'type import of `Bar`']),
          ],
        }),
        // Option alphabetize: {order: 'desc'}
        tInvalid({
          code: `
              import a from 'foo';
              import type { A } from 'foo';
              import c from 'Bar';
              import type { C } from 'Bar';
              import b from 'bar';

              import index from './';
            `,
          output: `
              import a from 'foo';
              import type { A } from 'foo';
              import b from 'bar';
              import c from 'Bar';
              import type { C } from 'Bar';

              import index from './';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index'],
              alphabetize: { order: 'desc' },
            },
          ],
          errors: [
            createOrderError(['`bar` import', 'before', 'import of `Bar`']),
          ],
        }),
        // Option alphabetize: {order: 'asc'} with type group
        tInvalid({
          code: `
              import b from 'bar';
              import c from 'Bar';
              import a from 'foo';

              import index from './';

              import type { A } from 'foo';
              import type { C } from 'Bar';
            `,
          output: `
              import c from 'Bar';
              import b from 'bar';
              import a from 'foo';

              import index from './';

              import type { C } from 'Bar';
              import type { A } from 'foo';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index', 'type'],
              alphabetize: { order: 'asc' },
            },
          ],
          errors: [
            createOrderError(['`Bar` import', 'before', 'import of `bar`']),
            createOrderError([
              '`Bar` type import',
              'before',
              'type import of `foo`',
            ]),
          ],
        }),
        // Option alphabetize: {order: 'desc'} with type group
        tInvalid({
          code: `
              import a from 'foo';
              import c from 'Bar';
              import b from 'bar';

              import index from './';

              import type { C } from 'Bar';
              import type { A } from 'foo';
            `,
          output: `
              import a from 'foo';
              import b from 'bar';
              import c from 'Bar';

              import index from './';

              import type { A } from 'foo';
              import type { C } from 'Bar';
            `,
          ...parserConfig,
          options: [
            {
              groups: ['external', 'index', 'type'],
              alphabetize: { order: 'desc' },
            },
          ],
          errors: [
            createOrderError(['`bar` import', 'before', 'import of `Bar`']),
            createOrderError([
              '`foo` type import',
              'before',
              'type import of `Bar`',
            ]),
          ],
        }),
        // warns for out of order unassigned imports (warnOnUnassignedImports enabled)
        tInvalid({
          code: `
              import './local1';
              import global from 'global1';
              import local from './local2';
              import 'global2';
            `,
          errors: [
            createOrderError([
              '`global1` import',
              'before',
              'import of `./local1`',
            ]),
            createOrderError([
              '`global2` import',
              'before',
              'import of `./local1`',
            ]),
          ],
          options: [{ warnOnUnassignedImports: true }],
        }),
        // fix cannot move below unassigned import (warnOnUnassignedImports enabled)
        tInvalid({
          code: `
              import local from './local';

              import 'global1';

              import global2 from 'global2';
              import global3 from 'global3';
            `,
          errors: [
            createOrderError([
              '`./local` import',
              'after',
              'import of `global3`',
            ]),
          ],
          options: [{ warnOnUnassignedImports: true }],
        }),
        // Imports inside module declaration
        tInvalid({
          code: `
              import type { ParsedPath } from 'path';
              import type { CopyOptions } from 'fs';

              declare module 'my-module' {
                import type { ParsedPath } from 'path';
                import type { CopyOptions } from 'fs';
              }
            `,
          output: `
              import type { CopyOptions } from 'fs';
              import type { ParsedPath } from 'path';

              declare module 'my-module' {
                import type { CopyOptions } from 'fs';
                import type { ParsedPath } from 'path';
              }
            `,
          errors: [
            createOrderError([
              '`fs` type import',
              'before',
              'type import of `path`',
            ]),
            createOrderError([
              '`fs` type import',
              'before',
              'type import of `path`',
            ]),
          ],
          ...parserConfig,
          options: [
            {
              alphabetize: { order: 'asc' },
            },
          ],
        }),

        // named import order
        tInvalid({
          code: `
            import { type Z, A } from "./Z";
            import type N, { E, D } from "./Z";
            import type { L, G } from "./Z";
          `,
          output: `
            import { A, type Z } from "./Z";
            import type N, { D, E } from "./Z";
            import type { G, L } from "./Z";
          `,
          ...parserConfig,
          options: [
            {
              named: true,
              alphabetize: { order: 'asc' },
            },
          ],
          errors: [
            createOrderError(['`A` import', 'before', 'type import of `Z`']),
            createOrderError(['`D` import', 'before', 'import of `E`']),
            createOrderError(['`G` import', 'before', 'import of `L`']),
          ],
        }),
        tInvalid({
          code: `
            const { B, /* Hello World */ A } = require("./Z");
            export { B, A } from "./Z";
          `,
          output: `
            const { /* Hello World */ A, B } = require("./Z");
            export { A, B } from "./Z";
          `,
          ...parserConfig,
          options: [
            {
              named: true,
              alphabetize: { order: 'asc' },
            },
          ],
          errors: [
            createOrderError(['`A` import', 'before', 'import of `B`']),
            createOrderError(['`A` export', 'before', 'export of `B`']),
          ],
        }),

        ...(supportsExportTypeSpecifiers
          ? [
              tInvalid({
                code: `
              export { type B, A };
            `,
                output: `
              export { A, type B };
            `,
                ...parserConfig,
                options: [
                  {
                    named: {
                      enabled: true,
                      types: 'mixed',
                    },
                    alphabetize: { order: 'asc' },
                  },
                ],
                errors: [
                  createOrderError([
                    '`A` export',
                    'before',
                    'type export of `B`',
                  ]),
                ],
              }),
              tInvalid({
                code: `
              import { type B, A, default as C } from "./Z";
            `,
                output: `
              import { A, default as C, type B } from "./Z";
            `,
                ...parserConfig,
                options: [
                  {
                    named: {
                      import: true,
                      types: 'types-last',
                    },
                    alphabetize: { order: 'asc' },
                  },
                ],
                errors: [
                  createOrderError([
                    '`B` type import',
                    'after',
                    'import of `default`',
                  ]),
                ],
              }),
              tInvalid({
                code: `
              export { A, type Z } from "./Z";
            `,
                output: `
              export { type Z, A } from "./Z";
            `,
                ...parserConfig,
                options: [
                  {
                    named: {
                      enabled: true,
                      types: 'types-first',
                    },
                  },
                ],
                errors: [
                  createOrderError([
                    '`Z` type export',
                    'before',
                    'export of `A`',
                  ]),
                ],
              }),
            ]
          : []),

        tInvalid({
          code: `
          import express from 'express';
          import log4js from 'log4js';
          import chpro from 'node:child_process';
          // import fsp from 'node:fs/promises';
        `,
          output: `
          import chpro from 'node:child_process';
          import express from 'express';
          import log4js from 'log4js';
          // import fsp from 'node:fs/promises';
        `,
          options: [
            {
              groups: [
                'builtin',
                'external',
                'internal',
                'parent',
                'sibling',
                'index',
                'object',
                'type',
              ],
            },
          ],
          errors: [
            createOrderError([
              '`node:child_process` import',
              'before',
              'import of `express`',
            ]),
            // { message: '`node:fs/promises` import should occur before import of `express`' },
          ],
        }),
        // By default it should order same as TS LSP (issue-286)
        tInvalid({
          code: `import { scopeA } from "@a/a";
import fs from 'node:fs';
import path from "path";
import { localA } from "./a";
import { internA } from "#a";
`,
          output: `import { internA } from "#a";
import { scopeA } from "@a/a";
import fs from 'node:fs';
import path from "path";
import { localA } from "./a";
`,
          ...parserConfig,
          options: [
            {
              privateImportsFeatureFlag: true,
            },
          ],
          errors: [
            createOrderError(['`#a` import', 'before', 'import of `@a/a`']),
          ],
        }),
      ],
    })
  }
})

flowRuleTester.run('order', rule, {
  valid: [
    tValid({
      options: [
        {
          alphabetize: { order: 'asc', orderImportKind: 'asc' },
        },
      ],
      code: `
        import type {Bar} from 'common';
        import typeof {foo} from 'common';
        import {bar} from 'common';
      `,
    }),
  ],
  invalid: [
    tInvalid({
      options: [
        {
          alphabetize: { order: 'asc', orderImportKind: 'asc' },
        },
      ],
      code: `
        import type {Bar} from 'common';
        import {bar} from 'common';
        import typeof {foo} from 'common';
      `,
      output: `
        import type {Bar} from 'common';
        import typeof {foo} from 'common';
        import {bar} from 'common';
      `,
      errors: [
        createOrderError([
          '`common` typeof import',
          'before',
          'import of `common`',
        ]),
      ],
    }),
    tInvalid({
      options: [
        {
          alphabetize: { order: 'asc', orderImportKind: 'desc' },
        },
      ],
      code: `
        import type {Bar} from 'common';
        import {bar} from 'common';
        import typeof {foo} from 'common';
      `,
      output: `
        import {bar} from 'common';
        import typeof {foo} from 'common';
        import type {Bar} from 'common';
      `,
      errors: [
        createOrderError([
          '`common` type import',
          'after',
          'typeof import of `common`',
        ]),
      ],
    }),
    tInvalid({
      options: [
        {
          alphabetize: { order: 'asc', orderImportKind: 'asc' },
        },
      ],
      code: `
        import type {Bar} from './local/sub';
        import {bar} from './local/sub';
        import {baz} from './local-sub';
        import typeof {foo} from './local/sub';
      `,
      output: `
        import type {Bar} from './local/sub';
        import typeof {foo} from './local/sub';
        import {bar} from './local/sub';
        import {baz} from './local-sub';
      `,
      errors: [
        createOrderError([
          '`./local/sub` typeof import',
          'before',
          'import of `./local/sub`',
        ]),
      ],
    }),
    tInvalid({
      code: `
        import { cfg } from 'path/path/path/src/Cfg';
        import { l10n } from 'path/src/l10n';
        import { helpers } from 'path/path/path/helpers';
        import { tip } from 'path/path/tip';

        import { controller } from '../../../../path/path/path/controller';
        import { component } from '../../../../path/path/path/component';
      `,
      output: [
        `
        import { helpers } from 'path/path/path/helpers';
        import { cfg } from 'path/path/path/src/Cfg';
        import { l10n } from 'path/src/l10n';
        import { tip } from 'path/path/tip';

        import { component } from '../../../../path/path/path/component';
        import { controller } from '../../../../path/path/path/controller';
      `,
        `
        import { helpers } from 'path/path/path/helpers';
        import { cfg } from 'path/path/path/src/Cfg';
        import { tip } from 'path/path/tip';
        import { l10n } from 'path/src/l10n';

        import { component } from '../../../../path/path/path/component';
        import { controller } from '../../../../path/path/path/controller';
      `,
      ],
      languageOptions: { parser: require(parsers.ESPREE) },
      options: [
        {
          groups: [
            ['builtin', 'external'],
            'internal',
            ['sibling', 'parent'],
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: 'react',
              group: 'builtin',
              position: 'before',
              patternOptions: {
                matchBase: true,
              },
            },
            {
              pattern: '*.+(css|svg)',
              group: 'type',
              position: 'after',
              patternOptions: {
                matchBase: true,
              },
            },
          ],
          // @ts-expect-error testing options
          pathGroupsExcludedImportTypes: ['react'],
          alphabetize: {
            order: 'asc',
          },
          'newlines-between': 'always',
        },
      ],
      errors: [
        {
          ...createOrderError([
            '`path/path/path/helpers` import',
            'before',
            'import of `path/path/path/src/Cfg`',
          ]),
          line: 4,
          column: 9,
        },
        {
          ...createOrderError([
            '`path/path/tip` import',
            'before',
            'import of `path/src/l10n`',
          ]),
          line: 5,
          column: 9,
        },
        {
          ...createOrderError([
            '`../../../../path/path/path/component` import',
            'before',
            'import of `../../../../path/path/path/controller`',
          ]),
          line: 8,
          column: 9,
        },
      ],
    }),
  ],
})
