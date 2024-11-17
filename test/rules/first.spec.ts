import fs from 'node:fs'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, parsers, testFilePath } from '../utils'

import rule from 'eslint-plugin-import-x/rules/first'

const ruleTester = new TSESLintRuleTester()

const { tValid, tInvalid } = createRuleTestCaseFunctions<typeof rule>()

ruleTester.run('first', rule, {
  valid: [
    tValid({
      code: "import { x } from './foo'; import { y } from './bar';\
            export { x, y }",
    }),
    tValid({ code: "import { x } from 'foo'; import { y } from './bar'" }),
    tValid({ code: "import { x } from './foo'; import { y } from 'bar'" }),
    tValid({
      code: "import { x } from './foo'; import { y } from 'bar'",
      options: ['disable-absolute-first'],
    }),
    tValid({
      code: "'use directive';\
            import { x } from 'foo';",
    }),
    tValid({
      name: '...component.html (issue #2210)',
      code: fs.readFileSync(testFilePath('component.html'), 'utf8'),
      languageOptions: {
        parser: require('@angular-eslint/template-parser'),
      },
    }),
  ],
  invalid: [
    tInvalid({
      code: "import { x } from './foo';\
              export { x };\
              import { y } from './bar';",
      errors: [{ messageId: 'order' }],
      output:
        "import { x } from './foo';\
              import { y } from './bar';\
              export { x };",
    }),
    tInvalid({
      code: "import { x } from './foo';\
              export { x };\
              import { y } from './bar';\
              import { z } from './baz';",
      errors: [{ messageId: 'order' }, { messageId: 'order' }],
      output:
        "import { x } from './foo';\
              import { y } from './bar';\
              import { z } from './baz';\
              export { x };",
    }),
    tInvalid({
      code: "import { x } from './foo'; import { y } from 'bar'",
      options: ['absolute-first'],
      errors: [{ messageId: 'absolute' }],
    }),
    tInvalid({
      code: "import { x } from 'foo';\
              'use directive';\
              import { y } from 'bar';",
      errors: [{ messageId: 'order' }],
      output:
        "import { x } from 'foo';\
              import { y } from 'bar';\
              'use directive';",
    }),
    tInvalid({
      code: "var a = 1;\
              import { y } from './bar';\
              if (true) { x() };\
              import { x } from './foo';\
              import { z } from './baz';",
      errors: [
        { messageId: 'order' },
        { messageId: 'order' },
        { messageId: 'order' },
      ],
      output: [
        "import { y } from './bar';\
              var a = 1;\
              if (true) { x() };\
              import { x } from './foo';\
              import { z } from './baz';",
        "import { y } from './bar';\
              import { x } from './foo';\
              var a = 1;\
              if (true) { x() };\
              import { z } from './baz';",
        "import { y } from './bar';\
              import { x } from './foo';\
              import { z } from './baz';\
              var a = 1;\
              if (true) { x() };",
      ],
    }),
    tInvalid({
      code: "if (true) { console.log(1) }import a from 'b'",
      errors: [{ messageId: 'order' }],
      output: "import a from 'b'\nif (true) { console.log(1) }",
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

  ruleTester.run('order', rule, {
    valid: [
      tValid({
        code: `
          import y = require('bar');
          import { x } from 'foo';
          import z = require('baz');
        `,
        ...parserConfig,
      }),
    ],
    invalid: [
      tInvalid({
        code: `
          import { x } from './foo';
          import y = require('bar');
        `,
        options: ['absolute-first'],
        ...parserConfig,
        errors: [{ messageId: 'absolute' }],
      }),
    ],
  })
})
