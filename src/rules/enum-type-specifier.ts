import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/index.js';

function isEnum(node: TSESTree.Node): boolean {
  return node.type === 'TSEnumDeclaration';
}

export default createRule({
  name: 'enum-type-specifier',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect mis-use of enums in type imports.',
      category: 'Possible Errors',
      recommended: true,
    },
    schema: [],
    messages: {
      enumTypeSpecifier: 'Enum {{name}} should not be used as a type import.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.importKind === 'type') {
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportSpecifier' && isEnum(specifier.imported)) {
              context.report({
                node: specifier,
                messageId: 'enumTypeSpecifier',
                data: {
                  name: specifier.imported.name,
                },
              });
            }
          }
        }
      },
      ImportSpecifier(node) {
        if (node.importKind === 'type' && isEnum(node.imported)) {
          context.report({
            node,
            messageId: 'enumTypeSpecifier',
            data: {
              name: node.imported.name,
            },
          });
        }
      },
    };
  },
});
