import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

import { createRule } from '../utils'

type MessageId = 'noMutable'

export = createRule<[], MessageId>({
  name: 'no-mutable-exports',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Helpful warnings',
      description: 'Forbid the use of mutable exports with `var` or `let`.',
    },
    schema: [],
    messages: {
      noMutable: "Exporting mutable '{{kind}}' binding, use 'const' instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    function checkDeclaration(node: TSESTree.NamedExportDeclarations) {
      if ('kind' in node && (node.kind === 'var' || node.kind === 'let')) {
        context.report({
          node,
          messageId: 'noMutable',
          data: {
            kind: node.kind,
          },
        })
      }
    }

    function checkDeclarationsInScope(
      { variables }: TSESLint.Scope.Scope,
      name: string,
    ) {
      for (const variable of variables) {
        if (variable.name === name) {
          for (const def of variable.defs) {
            if (def.type === 'Variable' && def.parent) {
              checkDeclaration(def.parent)
            }
          }
        }
      }
    }

    return {
      ExportDefaultDeclaration(node) {
        // For ESLint v9
        const scope: TSESLint.Scope.Scope = (context as any)?.sourceCode
          ?.getScope
          ? (context as any).sourceCode.getScope(node)
          : context.getScope()

        if ('name' in node.declaration) {
          checkDeclarationsInScope(scope, node.declaration.name)
        }
      },
      ExportNamedDeclaration(node) {
        // For ESLint v9
        const scope: TSESLint.Scope.Scope = (context as any)?.sourceCode
          ?.getScope
          ? (context as any).sourceCode.getScope(node)
          : context.getScope()

        if (node.declaration) {
          checkDeclaration(node.declaration)
        } else if (!node.source) {
          for (const specifier of node.specifiers) {
            checkDeclarationsInScope(scope, specifier.local.name)
          }
        }
      },
    }
  },
})
