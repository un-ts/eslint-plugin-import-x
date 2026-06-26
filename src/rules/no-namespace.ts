/** Rule to disallow namespace import */

import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { minimatch } from 'minimatch'

import { createRule } from '../utils/index.js'

export type MessageId = 'noNamespace'

export interface Options {
  ignore?: string[]
}

export default createRule<[Options?], MessageId>({
  name: 'no-namespace',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Forbid namespace (a.k.a. "wildcard" `*`) imports.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: {
              type: 'string',
            },
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noNamespace: 'Unexpected namespace import.',
    },
  },
  defaultOptions: [],
  create(context) {
    const firstOption = context.options[0] || {}
    const ignoreGlobs = firstOption.ignore

    return {
      ImportNamespaceSpecifier(node) {
        if (
          ignoreGlobs?.find(glob =>
            minimatch(node.parent.source.value, glob, {
              matchBase: true,
              nocomment: true,
            }),
          )
        ) {
          return
        }

        const scopeVariables = context.sourceCode.getScope(node).variables
        const namespaceVariable = scopeVariables.find(
          variable => variable.defs[0].node === node,
        )!
        const namespaceReferences = namespaceVariable.references
        const namespaceIdentifiers = namespaceReferences.map(
          reference => reference.identifier,
        )
        const canFix =
          namespaceIdentifiers.length > 0 &&
          !usesNamespaceAsObject(namespaceIdentifiers)

        context.report({
          node,
          messageId: `noNamespace`,
          fix: canFix
            ? fixer => {
                const scopeManager = context.sourceCode.scopeManager!
                const fixes: TSESLint.RuleFix[] = []

                // Pass 1: Collect variable names that are already in scope for each reference we want
                // to transform, so that we can be sure that we choose non-conflicting import names
                const importNameConflicts: Record<string, Set<string>> = {}
                for (const identifier of namespaceIdentifiers) {
                  const parent = identifier.parent
                  if (parent && parent.type === 'MemberExpression') {
                    const importName = getMemberPropertyName(parent)
                    const localConflicts = getVariableNamesInScope(
                      scopeManager,
                      parent,
                    )
                    if (importNameConflicts[importName]) {
                      for (const c of localConflicts)
                        importNameConflicts[importName].add(c)
                    } else {
                      importNameConflicts[importName] = localConflicts
                    }
                  }
                }

                // Choose new names for each import
                const importNames = Object.keys(importNameConflicts)
                const importLocalNames = generateLocalNames(
                  importNames,
                  importNameConflicts,
                  namespaceVariable.name,
                )

                // Replace the ImportNamespaceSpecifier with a list of ImportSpecifiers
                const namedImportSpecifiers = importNames.map(importName =>
                  importName === importLocalNames[importName]
                    ? importName
                    : `${importName} as ${importLocalNames[importName]}`,
                )
                fixes.push(
                  fixer.replaceText(
                    node,
                    `{ ${namedImportSpecifiers.join(', ')} }`,
                  ),
                )

                // Pass 2: Replace references to the namespace with references to the named imports
                for (const identifier of namespaceIdentifiers) {
                  const parent = identifier.parent
                  if (parent && parent.type === 'MemberExpression') {
                    const importName = getMemberPropertyName(parent)
                    fixes.push(
                      fixer.replaceText(parent, importLocalNames[importName]),
                    )
                  }
                }

                return fixes
              }
            : null,
        })
      },
    }
  },
})

function usesNamespaceAsObject(
  namespaceIdentifiers: Array<TSESTree.Identifier | TSESTree.JSXIdentifier>,
) {
  return !namespaceIdentifiers.every(identifier => {
    const parent = identifier.parent

    // `namespace.x` or `namespace['x']`
    return (
      parent &&
      parent.type === 'MemberExpression' &&
      (parent.property.type === 'Identifier' ||
        parent.property.type === 'Literal')
    )
  })
}

function getMemberPropertyName(memberExpression: TSESTree.MemberExpression) {
  return memberExpression.property.type === 'Identifier'
    ? memberExpression.property.name
    : (memberExpression.property as TSESTree.StringLiteral).value
}

function getVariableNamesInScope(
  scopeManager: TSESLint.Scope.ScopeManager,
  node: TSESTree.Node,
) {
  let currentNode: TSESTree.Node = node
  let scope = scopeManager.acquire(currentNode)
  while (scope == null) {
    currentNode = currentNode.parent!
    scope = scopeManager.acquire(currentNode, true)
  }
  return new Set(
    [...scope.variables, ...scope.upper!.variables].map(
      variable => variable.name,
    ),
  )
}

function generateLocalNames(
  names: string[],
  nameConflicts: Record<string, Set<string>>,
  namespaceName: string,
) {
  const localNames: Record<string, string> = {}
  for (const name of names) {
    let localName: string
    if (!nameConflicts[name].has(name)) {
      localName = name
    } else if (nameConflicts[name].has(`${namespaceName}_${name}`)) {
      for (let i = 1; i < Number.POSITIVE_INFINITY; i++) {
        if (!nameConflicts[name].has(`${namespaceName}_${name}_${i}`)) {
          localName = `${namespaceName}_${name}_${i}`
          break
        }
      }
    } else {
      localName = `${namespaceName}_${name}`
    }
    localNames[name] = localName!
  }
  return localNames
}
