import fs from 'node:fs'

import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import * as semver from 'semver'

import { cjsRequire } from '../require.js'
import type { PackageJson, RuleContext } from '../types.js'
import { createRule, lazy, parse, resolve } from '../utils/index.js'

// a user might set prefer-inline but not have a supporting TypeScript version.  Flow does not support inline types so this should fail in that case as well.
// pre-calculate if the TypeScript version is supported
const isTypeScriptVersionSupportPreferInline = lazy(() => {
  let typescriptPkg: PackageJson | undefined

  try {
    typescriptPkg = cjsRequire<PackageJson>('typescript/package.json')
  } catch {
    //
  }

  return !typescriptPkg || !semver.satisfies(typescriptPkg.version!, '>= 4.5')
})

export interface Options {
  considerQueryString?: boolean
  considerReexports?: boolean
  'prefer-inline'?: boolean
  whitelist?: string[][]
}

export type MessageId = 'duplicate'

type Reexport = TSESTree.ExportNamedDeclaration & {
  source: TSESTree.StringLiteral
}

type ImportOrReexport = TSESTree.ImportDeclaration | Reexport

function isListed(group: Set<string>, sourcePath: string) {
  return group.has(sourcePath) || group.has(sourcePath.split('?')[0])
}

const DECLARATION_FILE_PATTERN = /\.d\.[cm]?ts$/

const declaredModulesCache = new Map<
  string,
  { mtimeMs: number; modules: Set<string> }
>()

/**
 * The module names a declaration file declares with `declare module '...'`
 * blocks. Bundlers like dts-buddy put every entry point of a package into one
 * such file, as svelte does in `svelte/types/index.d.ts`.
 */
function getDeclaredModules(filePath: string, context: RuleContext) {
  try {
    const { mtimeMs } = fs.statSync(filePath)
    let cached = declaredModulesCache.get(filePath)
    if (cached?.mtimeMs !== mtimeMs) {
      const { ast } = parse(
        filePath,
        fs.readFileSync(filePath, 'utf8'),
        context,
        false,
      )
      const modules = new Set<string>()
      for (const node of ast.body) {
        if (node.type === 'TSModuleDeclaration' && node.id.type === 'Literal') {
          modules.add(node.id.value)
        }
      }
      cached = { mtimeMs, modules }
      declaredModulesCache.set(filePath, cached)
    }
    return cached.modules
  } catch {
    return
  }
}

const getSpecifier = (node: ImportOrReexport) => node.source.value.split('?')[0]

/**
 * Splits imports that resolve to one declaration file into the entry points it
 * declares with `declare module`: `svelte` and `svelte/transition` share
 * `svelte/types/index.d.ts`, but they are different modules.
 */
function splitDeclaredModules<T extends ImportOrReexport>(
  imported: Map<string, T[]>,
  context: RuleContext,
) {
  const result: Array<[string, T[]]> = []
  for (const [key, nodes] of imported) {
    // `considerQueryString` appends the query to the resolved path
    const resolvedPath = key.split('?')[0]
    const declared =
      DECLARATION_FILE_PATTERN.test(resolvedPath) &&
      new Set(nodes.map(getSpecifier)).size > 1
        ? getDeclaredModules(resolvedPath, context)
        : undefined
    if (!declared?.size) {
      result.push([key, nodes])
      continue
    }
    const query = key.slice(resolvedPath.length)
    const modules = new Map<string, T[]>()
    for (const node of nodes) {
      const specifier = getSpecifier(node)
      const moduleKey = declared.has(specifier) ? specifier + query : key
      const members = modules.get(moduleKey)
      if (members) {
        members.push(node)
      } else {
        modules.set(moduleKey, [node])
      }
    }
    result.push(...modules)
  }
  return result
}

function checkImports<T extends ImportOrReexport>(
  imported: Iterable<[string, T[]]>,
  context: RuleContext<MessageId, [Options?]>,
  reexports = false,
) {
  for (const [module, nodes] of imported) {
    if (nodes.length <= 1) {
      // not enough imports, definitely not duplicates
      continue
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
        fix:
          i === 0
            ? reexports
              ? getReexportsFix(
                  nodes as Reexport[],
                  context.sourceCode,
                  context,
                )
              : getFix(
                  nodes as TSESTree.ImportDeclaration[],
                  context.sourceCode,
                  context,
                )
            : null,
      })
    }
  }
}

function getFix(
  nodes: TSESTree.ImportDeclaration[],
  sourceCode: TSESLint.SourceCode,
  context: RuleContext<MessageId, [Options?]>,
): TSESLint.ReportFixFunction | null {
  // Without `prefer-inline`, `import type {a}` and `import {type b, c}` share a
  // group. Keep the types in `import type` instead of writing inline types.
  if (
    !context.options[0]?.['prefer-inline'] &&
    nodes.some(node => node.importKind === 'type') &&
    nodes.some(node => node.importKind !== 'type')
  ) {
    // With a whitelist, the specifier is the entry point. Moving type imports
    // between imports with different source values could redirect them to another
    // entry point, so report the duplicates but leave the fix to the user.
    if (
      context.options[0]?.whitelist &&
      nodes.some(node => node.source.value !== nodes[0].source.value)
    ) {
      return null
    }
    return getTypeImportFix(nodes, sourceCode)
  }

  const first = nodes[0]

  // With a whitelist, the fix can merge into an import that isn't the first
  // one. Removing the earlier imports would then run the module after any
  // import in between, so leave that to the user.
  if (
    context.options[0]?.whitelist &&
    movesPastOtherImports(nodes, sourceCode)
  ) {
    return null
  }

  // Adjusting the first import might make it multiline, which could break
  // `eslint-disable-next-line` comments and similar, so bail if the first
  // import has comments. Also, if the first import is `import * as ns from
  // './foo'` there's nothing we can do, and `prefer-inline` can't keep the
  // `import type` that `resolution-mode` needs.
  if (
    hasProblematicComments(first, sourceCode) ||
    hasNamespace(first) ||
    (context.options[0]?.['prefer-inline'] && hasResolutionMode(first))
  ) {
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
    const openBrace = tokens.find(token => isSpecifierBrace(node, token, '{'))
    const closeBrace = tokens.find(token => isSpecifierBrace(node, token, '}'))

    if (openBrace == null || closeBrace == null) {
      return acc
    }

    acc.push({
      importNode: node,
      identifiers: splitSpecifiers(sourceCode, openBrace, closeBrace),
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
    () =>
      getDefaultImportName(first) == null &&
      defaultImportNames.size === 1 &&
      // The default import must come from an import that is merged here.
      restWithoutCommentsAndNamespaces.some(getDefaultImportName),
  )

  if (!shouldAddSpecifiers && !shouldRemoveUnnecessary && !shouldAddDefault()) {
    return null
  }

  // pre-caculate preferInline before actual fix function
  const preferInline = context.options[0] && context.options[0]['prefer-inline']

  return (fixer: TSESLint.RuleFixer) => {
    const tokens = sourceCode.getTokens(first)
    const openBrace = tokens.find(token => isSpecifierBrace(first, token, '{'))!
    const closeBrace = tokens.find(token =>
      isSpecifierBrace(first, token, '}'),
    )!
    const firstToken = sourceCode.getFirstToken(first)!
    const [defaultImportName] = defaultImportNames

    const firstHasTrailingComma =
      closeBrace != null &&
      isPunctuator(sourceCode.getTokenBefore(closeBrace)!, ',')
    const firstIsEmpty = !hasSpecifiers(first)
    const firstExistingIdentifiers = firstIsEmpty
      ? new Set()
      : new Set(
          splitSpecifiers(sourceCode, openBrace, closeBrace).map(
            normalizeSpecifier,
          ),
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
              const trimmed = normalizeSpecifier(cur) // Normalize to compare to our set of existing identifiers
              if (trimmed.length === 0 || existingIdentifiers.has(trimmed)) {
                return [text, set]
              }

              const curWithType =
                preferInline && isTypeSpecifier
                  ? cur.replace(/^(\s*)/, '$1type ')
                  : cur

              return [
                text.length > 0 ? `${text},${curWithType}` : curWithType,
                set.add(trimmed),
              ]
            },
            ['', existingIdentifiers],
          )

        return [
          needsComma && !specifier.isEmpty && specifierText.length > 0
            ? `${trimSpecifierEnd(result)},${specifierText}`
            : `${result}${specifierText}`,
          specifier.isEmpty || specifierText.length === 0 ? needsComma : true,
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

      for (const specifier of first.specifiers) {
        fixes.push(fixer.insertTextBefore(specifier, 'type '))
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
        fixes.push(
          fixer.insertTextAfter(
            sourceCode.getTokenBefore(closeBrace)!,
            trimSpecifierEnd(specifiersText),
          ),
        )
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
      const tokenBefore = sourceCode.getTokenBefore(closeBrace)!
      // `import {...} './foo'` → `import {..., ...} from './foo'`
      fixes.push(
        fixer.insertTextAfter(tokenBefore, trimSpecifierEnd(specifiersText)),
      )
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

// Merge `export {b} from './foo'` into the first re-export of the group, so
// `export {a} from './foo'` becomes `export {a, b} from './foo'`.
function getReexportsFix(
  nodes: Reexport[],
  sourceCode: TSESLint.SourceCode,
  context: RuleContext<MessageId, [Options?]>,
): TSESLint.ReportFixFunction | null {
  const first = nodes[0]

  // Merging into another re-export would run the modules in a different order
  if (
    context.options[0]?.whitelist &&
    movesPastOtherImports(nodes, sourceCode)
  ) {
    return null
  }

  // Leave it to the user to handle comments, like for imports
  if (hasProblematicComments(first, sourceCode)) {
    return null
  }

  const rest = nodes
    .slice(1)
    .filter(
      node =>
        !hasProblematicComments(node, sourceCode) &&
        sourceCode.getCommentsInside(node).length === 0,
    )

  if (rest.length === 0) {
    return null
  }

  const existing = new Set(
    first.specifiers.map(specifier =>
      normalizeSpecifier(sourceCode.getText(specifier)),
    ),
  )
  const added: string[] = []

  for (const node of rest) {
    for (const specifier of node.specifiers) {
      const text = sourceCode.getText(specifier)
      const normalized = normalizeSpecifier(text)
      if (!existing.has(normalized)) {
        existing.add(normalized)
        added.push(text)
      }
    }
  }

  return (fixer: TSESLint.RuleFixer) => {
    const closeBrace = sourceCode
      .getTokens(first)
      .find(token => isSpecifierBrace(first, token, '}'))!
    const tokenBefore = sourceCode.getTokenBefore(closeBrace)!
    const fixes = []

    if (added.length > 0) {
      fixes.push(
        fixer.insertTextAfter(
          tokenBefore,
          isPunctuator(tokenBefore, ',')
            ? ` ${added.join(', ')},`
            : `, ${added.join(', ')}`,
        ),
      )
    }

    for (const node of rest) {
      fixes.push(fixer.remove(node))

      const charAfterRange = [node.range[1], node.range[1] + 1] as const
      if (sourceCode.text.slice(...charAfterRange) === '\n') {
        fixes.push(fixer.removeRange(charAfterRange))
      }
    }

    return fixes
  }
}

// Move `b` of `import {type b, c} from './foo'` into the first `import type` of
// the group and leave `c` where it is. The next fix pass merges the value
// imports that are left like any other duplicates.
function getTypeImportFix(
  nodes: TSESTree.ImportDeclaration[],
  sourceCode: TSESLint.SourceCode,
): TSESLint.ReportFixFunction | null {
  const first = nodes.find(node => node.importKind === 'type')!

  // Leave it to the user to handle comments, also inside the `{...}` part
  // since the specifiers are rewritten here.
  const hasComments = (node: TSESTree.ImportDeclaration) =>
    hasProblematicComments(node, sourceCode) ||
    sourceCode.getCommentsInside(node).length > 0

  const rest = nodes.filter(node => node !== first && !hasComments(node))

  if (hasComments(first) || rest.length === 0) {
    return null
  }

  return (fixer: TSESLint.RuleFixer) => {
    const tokens = sourceCode.getTokens(first)
    const closeBrace = tokens.find(token => isPunctuator(token, '}'))!
    const tokenBefore = sourceCode.getTokenBefore(closeBrace)!
    const existingIdentifiers = new Set(
      first.specifiers.map(specifier =>
        normalizeSpecifier(sourceCode.getText(specifier)),
      ),
    )
    const identifiers: string[] = []
    const fixes = []

    for (const node of rest) {
      const named = node.specifiers.filter(
        specifier => specifier.type === 'ImportSpecifier',
      )
      // All of `import type {a}`, but only `type b` of `import {type b, c}`
      const types = named.filter(
        specifier =>
          node.importKind === 'type' || specifier.importKind === 'type',
      )
      const values = named.filter(specifier => !types.includes(specifier))

      for (const specifier of types) {
        // Keep the whitespace before the specifier, but drop the inline `type`
        const text =
          sourceCode.text.slice(
            sourceCode.getTokenBefore(specifier)!.range[1],
            specifier.range[0],
          ) +
          sourceCode.text.slice(specifier.imported.range[0], specifier.range[1])
        const trimmed = normalizeSpecifier(text)
        if (!existingIdentifiers.has(trimmed)) {
          existingIdentifiers.add(trimmed)
          identifiers.push(text)
        }
      }

      if (values.length > 0) {
        // `import {type b, c} from './foo'` becomes `import {c} from './foo'`
        fixes.push(
          fixer.replaceTextRange(
            [named[0].range[0], named[named.length - 1].range[1]],
            values
              .map(specifier => sourceCode.getText(specifier))
              .join(
                sourceCode.text.slice(named[0].range[1], named[1].range[0]),
              ),
          ),
        )
      } else if (getDefaultImportName(node)) {
        // `import def, {type b} from './foo'` becomes `import def from './foo'`
        fixes.push(
          fixer.removeRange([
            node.specifiers[0].range[1],
            sourceCode.getTokenAfter(named[named.length - 1], token =>
              isPunctuator(token, '}'),
            )!.range[1],
          ]),
        )
      } else {
        // Remove imports that are left without specifiers.
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
    }

    if (identifiers.length > 0) {
      fixes.push(
        // Keep `type` of `import type` in the fix range, so another fix (like
        // `consistent-type-specifier-style`) cannot drop it in the same pass.
        fixer.replaceText(tokens[1], tokens[1].value),
        // `import type {a} from './foo'` becomes `import type {a,b} from './foo'`
        fixer.insertTextAfter(
          tokenBefore,
          hasSpecifiers(first) && !isPunctuator(tokenBefore, ',')
            ? `,${identifiers.join(',')}`
            : identifiers.join(','),
        ),
      )
    }

    return fixes
  }
}

// The whitespace before `}` of the first import stays, so the one a merged
// specifier had before its own `}` has to go. A line comment keeps its line break,
// or it would comment out what follows.
function trimSpecifierEnd(text: string) {
  const trimmed = text.trimEnd()
  return /\/\/[^\n]*$/.test(trimmed) ? text : trimmed
}

// `x as x` binds the same name as `x`, so compare them as equal.
function normalizeSpecifier(text: string) {
  return text.trim().replace(/^((?:type\s+)?)(\S+)\s+as\s+\2$/, '$1$2')
}

// Split the text inside `{...}` into separate identifiers, retaining any whitespace
// and comments before or after. Only comma tokens count, not commas inside comments.
function splitSpecifiers(
  sourceCode: TSESLint.SourceCode,
  openBrace: TSESTree.Token,
  closeBrace: TSESTree.Token,
) {
  const identifiers: string[] = []
  let start = openBrace.range[1]
  for (const token of sourceCode.getTokensBetween(openBrace, closeBrace)) {
    if (isPunctuator(token, ',')) {
      identifiers.push(sourceCode.text.slice(start, token.range[0]))
      start = token.range[1]
    }
  }
  identifiers.push(sourceCode.text.slice(start, closeBrace.range[0]))
  return identifiers
}

function isPunctuator(node: TSESTree.Token, value: '{' | '}' | ',') {
  return node.type === 'Punctuator' && node.value === value
}

// The braces of `import {...}`, not the ones of `with {...}` after the source.
function isSpecifierBrace(
  node: ImportOrReexport,
  token: TSESTree.Token,
  value: '{' | '}',
) {
  return isPunctuator(token, value) && token.range[0] < node.source.range[0]
}

// Imports of one path with different attributes can load different modules, so
// only imports with equal attributes are duplicates. The order of the attributes
// doesn't matter. Legacy parsers only set `assertions`.
function getAttributesKey(node: ImportOrReexport) {
  return (node.attributes ?? node.assertions ?? [])
    .map(({ key, value }) =>
      JSON.stringify([
        key.type === 'Identifier' ? key.name : key.value,
        value.value,
      ]),
    )
    .sort()
    .join(',')
}

// TypeScript only allows `resolution-mode` on `import type`.
function hasResolutionMode(node: TSESTree.ImportDeclaration) {
  return (node.attributes ?? node.assertions)?.some(
    ({ key }) => key.type !== 'Identifier' && key.value === 'resolution-mode',
  )
}

// Get the name of the default import of `node`, if any.
function getDefaultImportName(node: TSESTree.ImportDeclaration) {
  const defaultSpecifier = node.specifiers.find(
    specifier => specifier.type === 'ImportDefaultSpecifier',
  )
  return defaultSpecifier?.local.name
}

// Returns true if the fix would move imports[0] past another import statement.
function movesPastOtherImports(
  nodes: ImportOrReexport[],
  sourceCode: TSESLint.SourceCode,
) {
  const start = Math.min(...nodes.map(node => node.range[0]))
  const end = nodes[0].range[0]
  return sourceCode.ast.body.some(
    statement =>
      'source' in statement &&
      statement.source != null &&
      !nodes.includes(statement as ImportOrReexport) &&
      statement.range[0] > start &&
      statement.range[0] < end,
  )
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
  node: ImportOrReexport,
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
  node: ImportOrReexport,
  sourceCode: TSESLint.SourceCode,
) {
  return sourceCode
    .getCommentsBefore(node)
    .some(comment => comment.loc.end.line >= node.loc.start.line - 1)
}

// Checks whether `node` has a comment (that starts) on the same line as `node`
// (ends).
function hasCommentAfter(
  node: ImportOrReexport,
  sourceCode: TSESLint.SourceCode,
) {
  return sourceCode
    .getCommentsAfter(node)
    .some(comment => comment.loc.start.line === node.loc.end.line)
}

// Checks whether `node` has any comments _inside,_ except inside the `{...}`
// part (if any).
function hasCommentInsideNonSpecifiers(
  node: ImportOrReexport,
  sourceCode: TSESLint.SourceCode,
) {
  const tokens = sourceCode.getTokens(node)
  const openBraceIndex = tokens.findIndex(token =>
    isSpecifierBrace(node, token, '{'),
  )
  const closeBraceIndex = tokens.findIndex(token =>
    isSpecifierBrace(node, token, '}'),
  )
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

export interface ModuleMap {
  imported: Map<string, TSESTree.ImportDeclaration[]>
  nsImported: Map<string, TSESTree.ImportDeclaration[]>
  defaultTypesImported: Map<string, TSESTree.ImportDeclaration[]>
  namespaceTypesImported: Map<string, TSESTree.ImportDeclaration[]>
  namedTypesImported: Map<string, TSESTree.ImportDeclaration[]>
  reexported: Map<string, Reexport[]>
  typeReexported: Map<string, Reexport[]>
}

export default createRule<[Options?], MessageId>({
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
          considerReexports: {
            type: 'boolean',
          },
          'prefer-inline': {
            type: 'boolean',
          },
          whitelist: {
            type: 'array',
            items: {
              type: 'array',
              uniqueItems: true,
              items: {
                type: 'string',
              },
            },
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
    const considerReexports = context.options[0]?.considerReexports

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

    const whitelist = context.options[0]?.whitelist?.map(
      group => new Set(group),
    )

    // only specifiers listed in the same group are known to be different modules,
    // and two queries on one entry point only when both are listed with the query
    const areDifferentModules = (a: string, b: string) =>
      a !== b &&
      whitelist!.some(group =>
        a.split('?')[0] === b.split('?')[0]
          ? group.has(a) && group.has(b)
          : isListed(group, a) && isListed(group, b),
      )

    // where a specifier first appears in the whitelist, unlisted ones last
    const getWhitelistRank = (specifier: string) => {
      let rank = 0
      for (const group of whitelist!) {
        for (const entry of group) {
          if (entry === specifier || entry === specifier.split('?')[0]) {
            return rank
          }
          rank++
        }
      }
      return Infinity
    }

    // fix into the specifier the whitelist names, not an unlisted one
    const listedFirst = <T extends ImportOrReexport>(
      nodes: T[],
      specifier: string,
    ) =>
      getWhitelistRank(specifier) === Infinity
        ? nodes
        : [...nodes].sort(
            (a, b) =>
              Number(a.source.value !== specifier) -
              Number(b.source.value !== specifier),
          )

    /**
     * Splits imports that resolve to the same path into the modules the
     * whitelist keeps apart. The specifiers are placed in whitelist order, each
     * joining the first module it isn't kept apart from, so the result doesn't
     * depend on the order of the imports in the file.
     */
    const splitWhitelisted = <T extends ImportOrReexport>(
      imported: Iterable<[string, T[]]>,
    ) => {
      if (!whitelist) {
        return imported
      }
      const result: Array<[string, T[]]> = []
      for (const [resolvedPath, nodes] of imported) {
        const specifiers = [...new Set(nodes.map(node => node.source.value))]
          .map(specifier => ({
            specifier,
            rank: getWhitelistRank(specifier),
          }))
          .sort((a, b) =>
            a.rank === b.rank
              ? a.specifier.localeCompare(b.specifier)
              : a.rank - b.rank,
          )
        const modules: string[][] = []
        for (const { specifier } of specifiers) {
          const module = modules.find(members =>
            members.every(member => !areDifferentModules(member, specifier)),
          )
          if (module) {
            module.push(specifier)
          } else {
            modules.push([specifier])
          }
        }
        if (modules.length === 1) {
          result.push([resolvedPath, listedFirst(nodes, modules[0][0])])
          continue
        }
        for (const members of modules) {
          result.push([
            members[0],
            listedFirst(
              nodes.filter(node => members.includes(node.source.value)),
              members[0],
            ),
          ])
        }
      }
      return result
    }

    const splitModules = <T extends ImportOrReexport>(
      imported: Map<string, T[]>,
    ) => splitWhitelisted(splitDeclaredModules(imported, context))

    const resolvedPaths = new Map<string, string>()
    const resolveCached = (sourcePath: string) => {
      let resolvedPath = resolvedPaths.get(sourcePath)
      if (resolvedPath === undefined) {
        resolvedPath = resolver(sourcePath)
        resolvedPaths.set(sourcePath, resolvedPath)
      }
      return resolvedPath
    }

    const moduleMaps = new Map<TSESTree.Node, Map<string, ModuleMap>>()

    function getModuleMap(n: ImportOrReexport) {
      const parent = n.parent!
      const attributesKey = getAttributesKey(n)
      let parentMaps = moduleMaps.get(parent)
      if (!parentMaps) {
        parentMaps = new Map()
        moduleMaps.set(parent, parentMaps)
      }
      let map = parentMaps.get(attributesKey)
      if (!map) {
        map = {
          imported: new Map(),
          nsImported: new Map(),
          defaultTypesImported: new Map(),
          namespaceTypesImported: new Map(),
          namedTypesImported: new Map(),
          reexported: new Map(),
          typeReexported: new Map(),
        }
        parentMaps.set(attributesKey, map)
      }
      return map
    }

    function getImportMap(n: TSESTree.ImportDeclaration) {
      const map = getModuleMap(n)

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
        const resolvedPath = resolveCached(n.source.value)
        const importMap = getImportMap(n)

        if (importMap.has(resolvedPath)) {
          importMap.get(resolvedPath)!.push(n)
        } else {
          importMap.set(resolvedPath, [n])
        }
      },

      ExportNamedDeclaration(n) {
        if (
          !considerReexports ||
          n.source == null ||
          n.specifiers.length === 0 ||
          // Babel's `export v from` and `export v, * as ns from` can't be
          // merged into braces
          n.specifiers.some(
            specifier => (specifier.type as string) !== 'ExportSpecifier',
          )
        ) {
          return
        }
        const node = n as Reexport
        const map = getModuleMap(node)
        const reexported =
          node.exportKind === 'type' ? map.typeReexported : map.reexported
        const resolvedPath = resolveCached(node.source.value)
        if (reexported.has(resolvedPath)) {
          reexported.get(resolvedPath)!.push(node)
        } else {
          reexported.set(resolvedPath, [node])
        }
      },

      'Program:exit'() {
        for (const parentMaps of moduleMaps.values()) {
          for (const map of parentMaps.values()) {
            checkImports(splitModules(map.imported), context)
            checkImports(splitModules(map.nsImported), context)
            checkImports(splitModules(map.defaultTypesImported), context)
            checkImports(splitModules(map.namespaceTypesImported), context)
            checkImports(splitModules(map.namedTypesImported), context)
            checkImports(splitModules(map.reexported), context, true)
            checkImports(splitModules(map.typeReexported), context, true)
          }
        }
      },
    }
  },
})
