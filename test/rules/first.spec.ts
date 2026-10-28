import fs from 'node:fs'

import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester'
import type { TSESLint } from '@typescript-eslint/utils'

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

describe('Vue', () => {
  const vueParserConfig = {
    filename: testFilePath('foo.vue'),
    languageOptions: {
      parser:
        cjsRequire<TSESLint.Parser.LooseParserModule>('vue-eslint-parser'),
    },
  }

  ruleTester.run('first', rule, {
    valid: [
      tValid({
        name: 'imports at the top of `<script>` and `<script setup>` (#177)',
        code: `
          <script>
          import { a } from 'a'
          console.log(a)
          </script>

          <script setup>
          import { b } from 'b'
          console.log(b)
          </script>
        `,
        ...vueParserConfig,
      }),
      tValid({
        name: '`<script setup>` before `<script>`',
        code: `
          <script setup>
          import { b } from 'b'
          console.log(b)
          </script>

          <script>
          import { a } from 'a'
          console.log(a)
          </script>
        `,
        ...vueParserConfig,
      }),
      tValid({
        name: 'TypeScript script blocks',
        code: `
          <script lang="ts">
          import type { A } from 'a'
          export default {}
          </script>

          <script setup lang="ts">
          import { b } from 'b'
          const a: A = b
          </script>
        `,
        ...vueParserConfig,
        languageOptions: {
          ...vueParserConfig.languageOptions,
          parserOptions: {
            parser: cjsRequire('@typescript-eslint/parser'),
          },
        },
      }),
    ],
    invalid: [
      tInvalid({
        name: 'each script block is fixed on its own (#177)',
        code: `
          <script>
          console.log('a')
          import 'vue'
          console.log('b')
          </script>

          <script setup>
          console.log('c')
          import 'vue'
          console.log('d')
          </script>
        `,
        ...vueParserConfig,
        errors: [{ messageId: 'order' }, { messageId: 'order' }],
        output: [
          `
          <script>
          import 'vue'
          console.log('a')
          console.log('b')
          </script>

          <script setup>
          console.log('c')
          import 'vue'
          console.log('d')
          </script>
        `,
          `
          <script>
          import 'vue'
          console.log('a')
          console.log('b')
          </script>

          <script setup>
          import 'vue'
          console.log('c')
          console.log('d')
          </script>
        `,
        ],
      }),
      tInvalid({
        name: 'does not move an import into the other script block',
        code: `
          <script>
          export default { name: 'Foo' }
          </script>

          <script setup>
          const a = 1
          import { b } from 'b'
          </script>
        `,
        ...vueParserConfig,
        errors: [{ messageId: 'order' }],
        output: `
          <script>
          export default { name: 'Foo' }
          </script>

          <script setup>
          import { b } from 'b'
          const a = 1
          </script>
        `,
      }),
      tInvalid({
        name: 'non-Vue file parsed by vue-eslint-parser',
        code: "console.log('x')\nimport { y } from './bar'",
        languageOptions: vueParserConfig.languageOptions,
        errors: [{ messageId: 'order' }],
        output: "import { y } from './bar'\nconsole.log('x')",
      }),
    ],
  })
})
