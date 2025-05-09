import { RuleTester as TSESLintRuleTester } from '@typescript-eslint/rule-tester';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import rule from 'eslint-plugin-import-x/rules/enum-type-specifier';

const ruleTester = new TSESLintRuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('enum-type-specifier', rule, {
  valid: [
    {
      code: `import { Example } from 'example-file';`,
    },
    {
      code: `import type { Example } from 'example-file';`,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    {
      code: `import { type Example } from 'example-file';`,
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
  ],
  invalid: [
    {
      code: `import type { Example } from 'example-file';`,
      errors: [
        {
          messageId: 'enumTypeSpecifier',
          data: { name: 'Example' },
          type: AST_NODE_TYPES.ImportSpecifier,
        },
      ],
    },
    {
      code: `import { type Example } from 'example-file';`,
      errors: [
        {
          messageId: 'enumTypeSpecifier',
          data: { name: 'Example' },
          type: AST_NODE_TYPES.ImportSpecifier,
        },
      ],
    },
  ],
});
