import path from 'node:path'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

import { createRuleTestCaseFunctions } from '../utils.js'

import rule from 'eslint-plugin-import-x/rules/no-import-module-exports'

const ruleTester = new TSESLintRuleTester({
  languageOptions: {
    parserOptions: { ecmaVersion: 6, sourceType: 'module' },
  },
})

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

const NOT_ALLOWED_ERROR = {
  messageId: 'notAllowed',
  type: AST_NODE_TYPES.ImportDeclaration,
} as const

ruleTester.run('no-import-module-exports', rule, {
  valid: [
    tValid({
      code: `
        const thing = require('thing')
        module.exports = thing
      `,
    }),
    tValid({
      code: `
        import thing from 'otherthing'
        console.log(thing.module.exports)
      `,
    }),
    tValid({
      code: `
        import thing from 'other-thing'
        export default thing
      `,
    }),
    tValid({
      code: `
        const thing = require('thing')
        exports.foo = bar
      `,
    }),
    tValid({
      code: `
        import { module } from 'qunit'
        module.skip('A test', function () {})
      `,
    }),
    tValid({
      code: `
        import foo from 'path';
        module.exports = foo;
      `,
      // When the file matches the entry point defined in package.json
      // See test/fixtures/package.json
      filename: path.resolve('test/fixtures/index.js'),
    }),
    tValid({
      code: `
        import foo from 'path';
        module.exports = foo;
      `,
      filename: path.join(
        process.cwd(),
        'test/fixtures/some/other/entry-point.js',
      ),
      options: [{ exceptions: ['**/*/other/entry-point.js'] }],
    }),
    tValid({
      code: `
        import * as process from 'process';
        console.log(process.env);
      `,
      filename: path.join(
        process.cwd(),
        'test/fixtures/missing-entrypoint/cli.js',
      ),
    }),
    tValid({
      code: `
        import fs from 'fs/promises';

        const subscriptions = new Map();

        export default async (client) => {
            /**
             * loads all modules and their subscriptions
             */
            const modules = await fs.readdir('./src/modules');

            await Promise.all(
                modules.map(async (moduleName) => {
                    // Loads the module
                    const module = await import(\`./modules/\${moduleName}/module.js\`);
                    // skips the module, in case it is disabled.
                    if (module.enabled) {
                        // Loads each of it's subscriptions into their according list.
                        module.subscriptions.forEach((fun, event) => {
                            if (!subscriptions.has(event)) {
                                subscriptions.set(event, []);
                            }
                            subscriptions.get(event).push(fun);
                        });
                    }
                })
            );

            /**
             * Setting up all events.
             * binds all events inside the subscriptions map to call all functions provided
             */
            subscriptions.forEach((funs, event) => {
                client.on(event, (...args) => {
                    funs.forEach(async (fun) => {
                        try {
                            await fun(client, ...args);
                        } catch (e) {
                            client.emit('error', e);
                        }
                    });
                });
            });
        };
      `,
      languageOptions: {
        parserOptions: {
          ecmaVersion: 2020,
        },
      },
    }),
  ],
  invalid: [
    tInvalid({
      code: `
        import { stuff } from 'starwars'
        module.exports = thing
      `,
      errors: [NOT_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        import thing from 'starwars'
        const baz = module.exports = thing
        console.log(baz)
      `,
      errors: [NOT_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        import * as allThings from 'starwars'
        exports.bar = thing
      `,
      errors: [NOT_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        import thing from 'other-thing'
        exports.foo = bar
      `,
      errors: [NOT_ALLOWED_ERROR],
    }),
    tInvalid({
      code: `
        import foo from 'path';
        module.exports = foo;
      `,
      filename: path.resolve('test/fixtures/some/other/entry-point.js'),
      options: [{ exceptions: ['**/*/other/file.js'] }],
      errors: [NOT_ALLOWED_ERROR],
    }),
  ],
})
