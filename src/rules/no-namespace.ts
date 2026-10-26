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
          !usesNamespaceAsObject(namespaceIdentifiers) &&
          namespaceIdentifiers.every(identifier =>
            isBindableName(
              getMemberPropertyName(
                identifier.parent as TSESTree.MemberExpression,
              ),
            ),
          )

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
                      namespaceVariable.scope,
                    )
                    if (importNameConflicts[importName]) {
                      for (const c of localConflicts)
                        importNameConflicts[importName].add(c)
                    } else {
                      importNameConflicts[importName] = localConflicts
                    }
                  }
                }

                // Names in the module scope and above conflict for every reference, and a
                // global used anywhere in the module would be shadowed by the new import
                const outerNames = new Set(
                  scopeManager.globalScope!.through.map(
                    reference => reference.identifier.name,
                  ),
                )
                for (
                  let scope: TSESLint.Scope.Scope | null =
                    namespaceVariable.scope;
                  scope;
                  scope = scope.upper
                ) {
                  for (const variable of scope.variables) {
                    outerNames.add(variable.name)
                  }
                }

                // Choose new names for each import
                const importNames = Object.keys(importNameConflicts)
                const importLocalNames = generateLocalNames(
                  importNames,
                  importNameConflicts,
                  outerNames,
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
  namespaceScope: TSESLint.Scope.Scope,
) {
  let currentNode: TSESTree.Node = node
  let scope = scopeManager.acquire(currentNode)
  while (scope == null) {
    currentNode = currentNode.parent!
    scope = scopeManager.acquire(currentNode, true)
  }
  // A name declared in any scope between this reference and the namespace import
  // would shadow the new import here
  const names = new Set<string>()
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current && current !== namespaceScope;
    current = current.upper
  ) {
    for (const variable of current.variables) {
      names.add(variable.name)
    }
  }
  return names
}

const RESERVED_WORDS = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
])

// `ns.default` or `ns['some-key']` can't become a plain named import
function isBindableName(name: string) {
  return /^[$A-Z_a-z][\w$]*$/.test(name) && !RESERVED_WORDS.has(name)
}

function generateLocalNames(
  names: string[],
  nameConflicts: Record<string, Set<string>>,
  outerNames: Set<string>,
  namespaceName: string,
) {
  const localNames: Record<string, string> = {}
  for (const name of names) {
    const isTaken = (localName: string) =>
      nameConflicts[name].has(localName) || outerNames.has(localName)
    let localName: string
    if (!isTaken(name)) {
      localName = name
    } else if (isTaken(`${namespaceName}_${name}`)) {
      for (let i = 1; i < Number.POSITIVE_INFINITY; i++) {
        if (!isTaken(`${namespaceName}_${name}_${i}`)) {
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
