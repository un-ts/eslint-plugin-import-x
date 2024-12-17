import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import semver from 'semver'
import type { PackageJson } from 'type-fest'

import type { RuleContext } from '../types'
import { createRule, resolve } from '../utils'
import { lazy } from '../utils/lazy-value'

// a user might set prefer-inline but not have a supporting TypeScript version.  Flow does not support inline types so this should fail in that case as well.
// pre-calculate if the TypeScript version is supported
const isTypeScriptVersionSupportPreferInline = lazy(() => {
  let typescriptPkg: PackageJson | undefined

  try {
    // eslint-disable-next-line import-x/no-extraneous-dependencies
    typescriptPkg = require('typescript/package.json') as PackageJson
  } catch {
    //
  }

  return !typescriptPkg || !semver.satisfies(typescriptPkg.version!, '>= 4.5')
})

type Options = {
  considerQueryString?: boolean
  'prefer-inline'?: boolean
}

type MessageId = 'duplicate'

function checkImports(
  imported: Map<string, TSESTree.ImportDeclaration[]>,
  context: RuleContext<MessageId, [Options?]>,
) {
  // eslint-disable-next-line unicorn/no-array-for-each -- Map.forEach is faster than Map.entries
  imported.forEach((nodes, module) => {
    if (nodes.length <= 1) {
      // not enough imports, definitely not duplicates
      return
    }

    for (let i = 0, len = nodes.length; i < len; i++) {
      const node = nodes[i]
      context.report({
        node: node.source,
        messageId: 'duplicate',
        data: {
          module,
        },
        // Attach the autofix (if any) to the first import only
        fix: i === 0 ? getFix(nodes, context.sourceCode, context) : null,
      })
    }
  })
}

function getFix(
  nodes: TSESTree.ImportDeclaration[],
  sourceCode: TSESLint.SourceCode,
  context: RuleContext<MessageId, [Options?]>,
): TSESLint.ReportFixFunction | null {
  const first = nodes[0]

  // Adjusting the first import might make it multiline, which could break
  // `eslint-disable-next-line` comments and similar, so bail if the first
  // import has comments. Also, if the first import is `import * as ns from
  // './foo'` there's nothing we can do.
  if (hasProblematicComments(first, sourceCode) || hasNamespace(first)) {
    return null
  }

  const defaultImportNames = new Set(
    nodes.flatMap(x => getDefaultImportName(x) || []),
  )

  // Bail if there are multiple different default import names – it's up to the
  // user to choose which one to keep.
  if (defaultImportNames.size > 1) {
    return null
  }

  const rest = nodes.slice(1)

  // Leave it to the user to handle comments. Also skip `import * as ns from
  // './foo'` imports, since they cannot be merged into another import.
  const restWithoutCommentsAndNamespaces = rest.filter(
    node => !hasProblematicComments(node, sourceCode) && !hasNamespace(node),
  )

  const restWithoutCommentsAndNamespacesHasSpecifiers =
    restWithoutCommentsAndNamespaces.map(hasSpecifiers)

  const specifiers = restWithoutCommentsAndNamespaces.reduce<
    Array<{
      importNode: TSESTree.ImportDeclaration
      identifiers: string[]
      isEmpty: boolean
    }>
  >((acc, node, nodeIndex) => {
    const tokens = sourceCode.getTokens(node)
    const openBrace = tokens.find(token => isPunctuator(token, '{'))
    const closeBrace = tokens.find(token => isPunctuator(token, '}'))

    if (openBrace == null || closeBrace == null) {
      return acc
    }

    acc.push({
      importNode: node,
      identifiers: sourceCode.text
        .slice(openBrace.range[1], closeBrace.range[0])
        .split(','), // Split the text into separate identifiers (retaining any whitespace before or after)
      isEmpty: !restWithoutCommentsAndNamespacesHasSpecifiers[nodeIndex],
    })

    return acc
  }, [])

  const unnecessaryImports = restWithoutCommentsAndNamespaces.filter(
    (node, nodeIndex) =>
      !restWithoutCommentsAndNamespacesHasSpecifiers[nodeIndex] &&
      !specifiers.some(specifier => specifier.importNode === node),
  )

  const shouldAddSpecifiers = specifiers.length > 0
  const shouldRemoveUnnecessary = unnecessaryImports.length > 0
  const shouldAddDefault = lazy(
    () => getDefaultImportName(first) == null && defaultImportNames.size === 1,
  )

  if (!shouldAddSpecifiers && !shouldRemoveUnnecessary && !shouldAddDefault()) {
    return null
  }

  // pre-caculate preferInline before actual fix function
  const preferInline = context.options[0] && context.options[0]['prefer-inline']

  return (fixer: TSESLint.RuleFixer) => {
    const tokens = sourceCode.getTokens(first)
    const openBrace = tokens.find(token => isPunctuator(token, '{'))!
    const closeBrace = tokens.find(token => isPunctuator(token, '}'))!
    const firstToken = sourceCode.getFirstToken(first)!
    const [defaultImportName] = defaultImportNames

    const firstHasTrailingComma =
      closeBrace != null &&
      isPunctuator(sourceCode.getTokenBefore(closeBrace)!, ',')
    const firstIsEmpty = !hasSpecifiers(first)
    const firstExistingIdentifiers = firstIsEmpty
      ? new Set()
      : new Set(
          sourceCode.text
            .slice(openBrace.range[1], closeBrace.range[0])
            .split(',')
            .map(x => x.split(' as ')[0].trim())
        )

    const [specifiersText] = specifiers.reduce(
      ([result, needsComma, existingIdentifiers], specifier) => {
        const isTypeSpecifier =
          'importNode' in specifier &&
          specifier.importNode.importKind === 'type'

        if (preferInline && isTypeScriptVersionSupportPreferInline()) {
          throw new Error(
            'Your version of TypeScript does not support inline type imports.',
          )
        }

        // Add *only* the new identifiers that don't already exist, and track any new identifiers so we don't add them again in the next loop
        const [specifierText, updatedExistingIdentifiers] =
          specifier.identifiers.reduce(
            ([text, set], cur) => {
              const trimmed = cur.trim() // Trim whitespace before/after to compare to our set of existing identifiers
              const curWithType =
                trimmed.length > 0 && preferInline && isTypeSpecifier
                  ? `type ${cur}`
                  : cur
              if (existingIdentifiers.has(trimmed)) {
                return [text, set]
              }
              return [
                text.length > 0 ? `${text},${curWithType}` : curWithType,
                set.add(trimmed),
              ]
            },
            ['', existingIdentifiers],
          )

        return [
          needsComma && !specifier.isEmpty && specifierText.length > 0
            ? `${result},${specifierText}`
            : `${result}${specifierText}`,
          specifier.isEmpty ? needsComma : true,
          updatedExistingIdentifiers,
        ]
      },
      ['', !firstHasTrailingComma && !firstIsEmpty, firstExistingIdentifiers],
    )

    const fixes = []

    if (shouldAddSpecifiers && preferInline && first.importKind === 'type') {
      // `import type {a} from './foo'` → `import {type a} from './foo'`
      const typeIdentifierToken = tokens.find(
        token => token.type === 'Identifier' && token.value === 'type',
      )
      if (typeIdentifierToken) {
        fixes.push(
          fixer.removeRange([
            typeIdentifierToken.range[0],
            typeIdentifierToken.range[1] + 1,
          ]),
        )
      }

      for (const identifier of tokens.filter(token =>
        firstExistingIdentifiers.has(token.value),
      )) {
        fixes.push(
          fixer.replaceTextRange(
            [identifier.range[0], identifier.range[1]],
            `type ${identifier.value}`,
          ),
        )
      }
    }

    if (openBrace == null && shouldAddSpecifiers && shouldAddDefault()) {
      // `import './foo'` → `import def, {...} from './foo'`
      fixes.push(
        fixer.insertTextAfter(
          firstToken,
          ` ${defaultImportName}, {${specifiersText}} from`,
        ),
      )
    } else if (
      openBrace == null &&
      !shouldAddSpecifiers &&
      shouldAddDefault()
    ) {
      // `import './foo'` → `import def from './foo'`
      fixes.push(
        fixer.insertTextAfter(firstToken, ` ${defaultImportName} from`),
      )
    } else if (openBrace != null && closeBrace != null && shouldAddDefault()) {
      // `import {...} from './foo'` → `import def, {...} from './foo'`
      fixes.push(fixer.insertTextAfter(firstToken, ` ${defaultImportName},`))
      if (shouldAddSpecifiers) {
        // `import def, {...} from './foo'` → `import def, {..., ...} from './foo'`
        fixes.push(fixer.insertTextBefore(closeBrace, specifiersText))
      }
    } else if (
      openBrace == null &&
      shouldAddSpecifiers &&
      !shouldAddDefault()
    ) {
      if (first.specifiers.length === 0) {
        // `import './foo'` → `import {...} from './foo'`
        fixes.push(
          fixer.insertTextAfter(firstToken, ` {${specifiersText}} from`),
        )
      } else {
        // `import def from './foo'` → `import def, {...} from './foo'`
        fixes.push(
          fixer.insertTextAfter(first.specifiers[0], `, {${specifiersText}}`),
        )
      }
    } else if (openBrace != null && closeBrace != null && !shouldAddDefault()) {
      // `import {...} './foo'` → `import {..., ...} from './foo'`
      fixes.push(fixer.insertTextBefore(closeBrace, specifiersText))
    }

    // Remove imports whose specifiers have been moved into the first import.
    for (const specifier of specifiers) {
      const importNode = specifier.importNode
      fixes.push(fixer.remove(importNode))

      const charAfterImportRange = [
        importNode.range[1],
        importNode.range[1] + 1,
      ] as const
      const charAfterImport = sourceCode.text.slice(
        charAfterImportRange[0],
        charAfterImportRange[1],
      )
      if (charAfterImport === '\n') {
        fixes.push(fixer.removeRange(charAfterImportRange))
      }
    }

    // Remove imports whose default import has been moved to the first import,
    // and side-effect-only imports that are unnecessary due to the first
    // import.
    for (const node of unnecessaryImports) {
      fixes.push(fixer.remove(node))

      const charAfterImportRange = [node.range[1], node.range[1] + 1] as const
      const charAfterImport = sourceCode.text.slice(
        charAfterImportRange[0],
        charAfterImportRange[1],
      )
      if (charAfterImport === '\n') {
        fixes.push(fixer.removeRange(charAfterImportRange))
      }
    }

    return fixes
  }
}

function isPunctuator(node: TSESTree.Token, value: '{' | '}' | ',') {
  return node.type === 'Punctuator' && node.value === value
}

// Get the name of the default import of `node`, if any.
function getDefaultImportName(node: TSESTree.ImportDeclaration) {
  const defaultSpecifier = node.specifiers.find(
    specifier => specifier.type === 'ImportDefaultSpecifier',
  )
  return defaultSpecifier?.local.name
}

// Checks whether `node` has a namespace import.
function hasNamespace(node: TSESTree.ImportDeclaration) {
  return node.specifiers.some(
    specifier => specifier.type === 'ImportNamespaceSpecifier',
  )
}

// Checks whether `node` has any non-default specifiers.
function hasSpecifiers(node: TSESTree.ImportDeclaration) {
  return node.specifiers.some(specifier => specifier.type === 'ImportSpecifier')
}

// It's not obvious what the user wants to do with comments associated with
// duplicate imports, so skip imports with comments when autofixing.
function hasProblematicComments(
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
) {
  return (
    hasCommentBefore(node, sourceCode) ||
    hasCommentAfter(node, sourceCode) ||
    hasCommentInsideNonSpecifiers(node, sourceCode)
  )
}

// Checks whether `node` has a comment (that ends) on the previous line or on
// the same line as `node` (starts).
function hasCommentBefore(
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
) {
  return sourceCode
    .getCommentsBefore(node)
    .some(comment => comment.loc.end.line >= node.loc.start.line - 1)
}

// Checks whether `node` has a comment (that starts) on the same line as `node`
// (ends).
function hasCommentAfter(
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
) {
  return sourceCode
    .getCommentsAfter(node)
    .some(comment => comment.loc.start.line === node.loc.end.line)
}

// Checks whether `node` has any comments _inside,_ except inside the `{...}`
// part (if any).
function hasCommentInsideNonSpecifiers(
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
) {
  const tokens = sourceCode.getTokens(node)
  const openBraceIndex = tokens.findIndex(token => isPunctuator(token, '{'))
  const closeBraceIndex = tokens.findIndex(token => isPunctuator(token, '}'))
  // Slice away the first token, since we're no looking for comments _before_
  // `node` (only inside). If there's a `{...}` part, look for comments before
  // the `{`, but not before the `}` (hence the `+1`s).
  const someTokens =
    openBraceIndex !== -1 && closeBraceIndex !== -1
      ? [
          ...tokens.slice(1, openBraceIndex + 1),
          ...tokens.slice(closeBraceIndex + 1),
        ]
      : tokens.slice(1)
  return someTokens.some(
    token => sourceCode.getCommentsBefore(token).length > 0,
  )
}

export = createRule<[Options?], MessageId>({
  name: 'no-duplicates',
  meta: {
    type: 'problem',
    docs: {
      category: 'Style guide',
      description:
        'Forbid repeated import of the same module in multiple places.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          considerQueryString: {
            type: 'boolean',
          },
          'prefer-inline': {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      duplicate: "'{{module}}' imported multiple times.",
    },
  },
  defaultOptions: [],
  create(context) {
    const preferInline = context.options[0]?.['prefer-inline']

    // Prepare the resolver from options.
    const considerQueryStringOption = context.options[0]?.considerQueryString
    const defaultResolver = (sourcePath: string) =>
      resolve(sourcePath, context) || sourcePath
    const resolver = considerQueryStringOption
      ? (sourcePath: string) => {
          const parts = sourcePath.match(/^([^?]*)\?(.*)$/)
          if (!parts) {
            return defaultResolver(sourcePath)
          }
          return `${defaultResolver(parts[1])}?${parts[2]}`
        }
      : defaultResolver

    const moduleMaps = new Map<
      TSESTree.Node,
      {
        imported: Map<string, TSESTree.ImportDeclaration[]>
        nsImported: Map<string, TSESTree.ImportDeclaration[]>
        defaultTypesImported: Map<string, TSESTree.ImportDeclaration[]>
        namespaceTypesImported: Map<string, TSESTree.ImportDeclaration[]>
        namedTypesImported: Map<string, TSESTree.ImportDeclaration[]>
      }
    >()

    function getImportMap(n: TSESTree.ImportDeclaration) {
      const parent = n.parent!
      let map
      if (moduleMaps.has(parent)) {
        map = moduleMaps.get(parent)!
      } else {
        map = {
          imported: new Map(),
          nsImported: new Map(),
          defaultTypesImported: new Map(),
          namespaceTypesImported: new Map(),
          namedTypesImported: new Map(),
        }
        moduleMaps.set(parent, map)
      }

      if (n.importKind === 'type') {
        if (
          n.specifiers.length > 0 &&
          n.specifiers[0].type === 'ImportDefaultSpecifier'
        ) {
          return map.defaultTypesImported
        }
        if (
          n.specifiers.length > 0 &&
          n.specifiers[0].type === 'ImportNamespaceSpecifier'
        ) {
          return map.namespaceTypesImported
        }

        if (!preferInline) {
          return map.namedTypesImported
        }
      }

      if (
        !preferInline &&
        n.specifiers.some(
          spec => 'importKind' in spec && spec.importKind === 'type',
        )
      ) {
        return map.namedTypesImported
      }

      return hasNamespace(n) ? map.nsImported : map.imported
    }

    return {
      ImportDeclaration(n) {
        // resolved path will cover aliased duplicates
        const resolvedPath = resolver(n.source.value)
        const importMap = getImportMap(n)

        if (importMap.has(resolvedPath)) {
          importMap.get(resolvedPath)!.push(n)
        } else {
          importMap.set(resolvedPath, [n])
        }
      },

      'Program:exit'() {
        for (const map of moduleMaps.values()) {
          checkImports(map.imported, context)
          checkImports(map.nsImported, context)
          checkImports(map.defaultTypesImported, context)
          checkImports(map.namedTypesImported, context)
        }
      },
    }
  },
})
