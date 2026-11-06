import fs from 'node:fs'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'

import { createRuleTestCaseFunctions, parsers, testFilePath } from '../utils.js'

import { cjsRequire } from 'eslint-plugin-import-x'
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
        parser: cjsRequire('@angular-eslint/template-parser'),
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
      code: "'use client';\nconst a = 1;\nimport { y } from 'bar';",
      errors: [{ messageId: 'order' }],
      output: "'use client';\nimport { y } from 'bar';\nconst a = 1;",
    }),
    tInvalid({
      // directive with no trailing newline: moved import must not glue to the next statement
      code: "'use client';const a = 1;import { y } from 'bar'",
      errors: [{ messageId: 'order' }],
      output: "'use client';\nimport { y } from 'bar'\nconst a = 1;",
    }),
    tInvalid({
      // directive without a semicolon, import on the same line as the statement before it
      code: "'use client'\nfoo(); import { y } from 'bar'",
      errors: [{ messageId: 'order' }],
      output: "'use client'\nimport { y } from 'bar'\nfoo();",
    }),
    tInvalid({
      // the directive line has a trailing comment, so the fix is withheld
      code: "'use client'; // trailing comment\nfoo();\nimport { x } from 'foo'",
      errors: [{ messageId: 'order' }],
      output: null,
    }),
    tInvalid({
      // third-party line directives keep their target by withholding the fix
      code: "'use client'; // prettier-ignore\nfoo();\nimport { x } from 'foo'",
      errors: [{ messageId: 'order' }],
      output: null,
    }),
    tInvalid({
      // a next-line directive on the directive's line keeps its target the same way
      code: "'use client'; // @ts-ignore\nfoo();\nimport { x } from 'foo'",
      errors: [{ messageId: 'order' }],
      output: null,
    }),
    tInvalid({
      // a decorated next-line directive keeps its target too
      code: "'use client'; /** @ts-ignore */\nfoo();\nimport { x } from 'foo'",
      errors: [{ messageId: 'order' }],
      output: null,
    }),
    tInvalid({
      // do not move an import out of its next-line suppression
      code: "'use client';\nfoo();\n// @ts-ignore\nimport { y } from 'bar';",
      errors: [{ messageId: 'order' }],
      output: null,
    }),
    tInvalid({
      // a declined group leaves every report in it without a fix
      code: "'use client';\nfoo();\nimport { a } from 'bar';\n// @ts-ignore\nimport { b } from 'baz';",
      errors: [{ messageId: 'order' }, { messageId: 'order' }],
      output: null,
    }),
    tInvalid({
      // a plain comment on a moved import also leaves the group unfixed
      code: "'use client';\nfoo();\n// plain\nimport { y } from 'bar';",
      errors: [{ messageId: 'order' }],
      output: null,
    }),
    tInvalid({
      code: "'use strict';\n'use client';\nfoo();\nimport { x } from './foo';\nimport { y } from 'bar';",
      errors: [{ messageId: 'order' }, { messageId: 'order' }],
      output:
        "'use strict';\n'use client';\nimport { x } from './foo';\nimport { y } from 'bar';\nfoo();",
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
