import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { type MinimatchOptions, minimatch } from 'minimatch'

import { importType } from '../core/import-type'
import { isStaticRequire } from '../core/static-require'
import { createRule } from '../utils'
import type {
  AlphabetizeOptions,
  Arrayable,
  ImportType,
  PathGroup,
  RuleContext,
} from '../types'

interface ImportEntryWithRank extends ImportEntry {
  rank: number
}

// This is a **non-spec compliant** but works in practice replacement of `object.groupby` package.
const groupBy = <T>(
  array: T[],
  grouper: (curr: T, index: number) => string | number,
) =>
  array.reduce<Record<string, T[]>>((acc, curr, index) => {
    const key = grouper(curr, index)
    ;(acc[key] ||= []).push(curr)
    return acc
  }, {})

const defaultGroups = [
  'builtin',
  'external',
  'parent',
  'sibling',
  'index',
] as const

// REPORTING AND FIXING

function reverse(array: ImportEntryWithRank[]): ImportEntryWithRank[] {
  return array
    .map(function (v) {
      return { ...v, rank: -v.rank }
    })
    .reverse()
}

function getTokensOrCommentsAfter(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  count: number,
) {
  let currentNodeOrToken: TSESTree.Node | TSESTree.Token | null = node
  const result: Array<TSESTree.Node | TSESTree.Token> = []
  for (let i = 0; i < count; i++) {
    currentNodeOrToken = sourceCode.getTokenAfter(currentNodeOrToken, {
      includeComments: true,
    })
    if (currentNodeOrToken == null) {
      break
    }
    result.push(currentNodeOrToken)
  }
  return result
}

function getTokensOrCommentsBefore(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  count: number,
) {
  let currentNodeOrToken: TSESTree.Node | TSESTree.Token | null = node
  const result: Array<TSESTree.Node | TSESTree.Token> = []
  for (let i = 0; i < count; i++) {
    currentNodeOrToken = sourceCode.getTokenBefore(currentNodeOrToken, {
      includeComments: true,
    })
    if (currentNodeOrToken == null) {
      break
    }
    result.push(currentNodeOrToken)
  }
  return result.reverse()
}

function takeTokensAfterWhile(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  condition: (nodeOrToken: TSESTree.Node | TSESTree.Token) => boolean,
) {
  const tokens = getTokensOrCommentsAfter(sourceCode, node, 100)
  const result: Array<TSESTree.Node | TSESTree.Token> = []
  for (let i = 0; i < tokens.length; i++) {
    if (condition(tokens[i])) {
      result.push(tokens[i])
    } else {
      break
    }
  }
  return result
}

function takeTokensBeforeWhile(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
  condition: (nodeOrToken: TSESTree.Node | TSESTree.Token) => boolean,
) {
  const tokens = getTokensOrCommentsBefore(sourceCode, node, 100)
  const result: Array<TSESTree.Node | TSESTree.Token> = []
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (condition(tokens[i])) {
      result.push(tokens[i])
    } else {
      break
    }
  }
  return result.reverse()
}

function findOutOfOrder(imported: ImportEntryWithRank[]) {
  if (imported.length === 0) {
    return []
  }
  let maxSeenRankNode = imported[0]
  return imported.filter(function (importedModule) {
    const res = importedModule.rank < maxSeenRankNode.rank
    if (maxSeenRankNode.rank < importedModule.rank) {
      maxSeenRankNode = importedModule
    }
    return res
  })
}

function findRootNode(node: TSESTree.Node) {
  let parent = node
  while (
    parent.parent != null &&
    (!('body' in parent.parent) || parent.parent.body == null)
  ) {
    parent = parent.parent
  }
  return parent
}

function findEndOfLineWithComments(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
) {
  const tokensToEndOfLine = takeTokensAfterWhile(
    sourceCode,
    node,
    commentOnSameLineAs(node),
  )
  const endOfTokens =
    tokensToEndOfLine.length > 0
      ? tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1]
      : node.range[1]
  let result = endOfTokens
  for (let i = endOfTokens; i < sourceCode.text.length; i++) {
    if (sourceCode.text[i] === '\n') {
      result = i + 1
      break
    }
    if (
      sourceCode.text[i] !== ' ' &&
      sourceCode.text[i] !== '\t' &&
      sourceCode.text[i] !== '\r'
    ) {
      break
    }
    result = i + 1
  }
  return result
}

function commentOnSameLineAs(node: TSESTree.Node) {
  return (token: TSESTree.Node | TSESTree.Token) =>
    (token.type === 'Block' || token.type === 'Line') &&
    token.loc.start.line === token.loc.end.line &&
    token.loc.end.line === node.loc.end.line
}

function findStartOfLineWithComments(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
) {
  const tokensToEndOfLine = takeTokensBeforeWhile(
    sourceCode,
    node,
    commentOnSameLineAs(node),
  )
  const startOfTokens =
    tokensToEndOfLine.length > 0 ? tokensToEndOfLine[0].range[0] : node.range[0]
  let result = startOfTokens
  for (let i = startOfTokens - 1; i > 0; i--) {
    if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t') {
      break
    }
    result = i
  }
  return result
}

function isRequireExpression(
  expr?: TSESTree.Expression | null,
): expr is TSESTree.CallExpression {
  return (
    expr != null &&
    expr.type === 'CallExpression' &&
    expr.callee != null &&
    'name' in expr.callee &&
    expr.callee.name === 'require' &&
    expr.arguments != null &&
    expr.arguments.length === 1 &&
    expr.arguments[0].type === 'Literal'
  )
}

function isSupportedRequireModule(node: TSESTree.Node) {
  if (node.type !== 'VariableDeclaration') {
    return false
  }
  if (node.declarations.length !== 1) {
    return false
  }
  const decl = node.declarations[0]
  const isPlainRequire =
    decl.id &&
    (decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') &&
    isRequireExpression(decl.init)
  const isRequireWithMemberExpression =
    decl.id &&
    (decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') &&
    decl.init != null &&
    decl.init.type === 'CallExpression' &&
    decl.init.callee != null &&
    decl.init.callee.type === 'MemberExpression' &&
    isRequireExpression(decl.init.callee.object)
  return isPlainRequire || isRequireWithMemberExpression
}

function isPlainImportModule(
  node: TSESTree.Node,
): node is TSESTree.ImportDeclaration {
  return (
    node.type === 'ImportDeclaration' &&
    node.specifiers != null &&
    node.specifiers.length > 0
  )
}

function isPlainImportEquals(
  node: TSESTree.Node,
): node is TSESTree.TSImportEqualsDeclaration & {
  moduleReference: TSESTree.TSExternalModuleReference
} {
  return (
    node.type === 'TSImportEqualsDeclaration' &&
    'expression' in node.moduleReference &&
    !!node.moduleReference.expression
  )
}

function canCrossNodeWhileReorder(node: TSESTree.Node) {
  return (
    isSupportedRequireModule(node) ||
    isPlainImportModule(node) ||
    isPlainImportEquals(node)
  )
}

function canReorderItems(firstNode: TSESTree.Node, secondNode: TSESTree.Node) {
  const parent = firstNode.parent as TSESTree.Program
  const [firstIndex, secondIndex] = [
    parent.body.findIndex(it => it === firstNode),
    parent.body.findIndex(it => it === secondNode),
  ].sort()
  const nodesBetween = parent.body.slice(firstIndex, secondIndex + 1)
  for (const nodeBetween of nodesBetween) {
    if (!canCrossNodeWhileReorder(nodeBetween)) {
      return false
    }
  }
  return true
}

function makeImportDescription(node: ImportEntry) {
  if ('importKind' in node.node) {
    if (node.node.importKind === 'type') {
      return 'type import'
    }
    // @ts-expect-error - flow type
    if (node.node.importKind === 'typeof') {
      return 'typeof import'
    }
  }
  return 'import'
}

function fixOutOfOrder(
  context: RuleContext<MessageId>,
  firstNode: ImportEntryWithRank,
  secondNode: ImportEntryWithRank,
  order: 'before' | 'after',
) {
  const sourceCode = context.getSourceCode()

  const firstRoot = findRootNode(firstNode.node)
  const firstRootStart = findStartOfLineWithComments(sourceCode, firstRoot)
  const firstRootEnd = findEndOfLineWithComments(sourceCode, firstRoot)

  const secondRoot = findRootNode(secondNode.node)
  const secondRootStart = findStartOfLineWithComments(sourceCode, secondRoot)
  const secondRootEnd = findEndOfLineWithComments(sourceCode, secondRoot)
  const canFix = canReorderItems(firstRoot, secondRoot)

  let newCode = sourceCode.text.substring(secondRootStart, secondRootEnd)
  if (newCode[newCode.length - 1] !== '\n') {
    newCode = `${newCode}\n`
  }

  const firstImport = `${makeImportDescription(firstNode)} of \`${firstNode.displayName}\``
  const secondImport = `\`${secondNode.displayName}\` ${makeImportDescription(secondNode)}`

  context.report({
    node: secondNode.node,
    messageId: 'order',
    data: {
      firstImport,
      secondImport,
      order,
    },
    fix: canFix
      ? fixer =>
          order === 'before'
            ? fixer.replaceTextRange(
                [firstRootStart, secondRootEnd],
                newCode +
                  sourceCode.text.substring(firstRootStart, secondRootStart),
              )
            : fixer.replaceTextRange(
                [secondRootStart, firstRootEnd],
                sourceCode.text.substring(secondRootEnd, firstRootEnd) +
                  newCode,
              )
      : null,
  })
}

function reportOutOfOrder(
  context: RuleContext,
  imported: ImportEntryWithRank[],
  outOfOrder: ImportEntryWithRank[],
  order: 'before' | 'after',
) {
  outOfOrder.forEach(imp => {
    fixOutOfOrder(
      context,
      imported.find(importedItem => importedItem.rank > imp.rank)!,
      imp,
      order,
    )
  })
}

function makeOutOfOrderReport(
  context: RuleContext,
  imported: ImportEntryWithRank[],
) {
  const outOfOrder = findOutOfOrder(imported)
  if (!outOfOrder.length) {
    return
  }

  // There are things to report. Try to minimize the number of reported errors.
  const reversedImported = reverse(imported)
  const reversedOrder = findOutOfOrder(reversedImported)
  if (reversedOrder.length < outOfOrder.length) {
    reportOutOfOrder(context, reversedImported, reversedOrder, 'after')
    return
  }
  reportOutOfOrder(context, imported, outOfOrder, 'before')
}

const compareString = (a: string, b: string) => {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

/** Some parsers (languages without types) don't provide ImportKind */
const DEFAULT_IMPORT_KIND = 'value'

const getNormalizedValue = (node: ImportEntry, toLowerCase?: boolean) => {
  const value = node.value
  return toLowerCase ? String(value).toLowerCase() : value
}

function getSorter(alphabetizeOptions: AlphabetizeOptions) {
  const multiplier = alphabetizeOptions.order === 'asc' ? 1 : -1
  const orderImportKind = alphabetizeOptions.orderImportKind
  const multiplierImportKind =
    orderImportKind !== 'ignore' &&
    (alphabetizeOptions.orderImportKind === 'asc' ? 1 : -1)

  return (nodeA: ImportEntry, nodeB: ImportEntry) => {
    const importA = getNormalizedValue(
      nodeA,
      alphabetizeOptions.caseInsensitive,
    )
    const importB = getNormalizedValue(
      nodeB,
      alphabetizeOptions.caseInsensitive,
    )
    let result = 0

    if (!importA.includes('/') && !importB.includes('/')) {
      result = compareString(importA, importB)
    } else {
      const A = importA.split('/')
      const B = importB.split('/')
      const a = A.length
      const b = B.length

      for (let i = 0; i < Math.min(a, b); i++) {
        result = compareString(A[i], B[i])
        if (result) {
          break
        }
      }

      if (!result && a !== b) {
        result = a < b ? -1 : 1
      }
    }

    result = result * multiplier

    // In case the paths are equal (result === 0), sort them by importKind
    if (!result && multiplierImportKind) {
      result =
        multiplierImportKind *
        compareString(
          ('importKind' in nodeA.node && nodeA.node.importKind) ||
            DEFAULT_IMPORT_KIND,
          ('importKind' in nodeB.node && nodeB.node.importKind) ||
            DEFAULT_IMPORT_KIND,
        )
    }

    return result
  }
}

function mutateRanksToAlphabetize(
  imported: ImportEntryWithRank[],
  alphabetizeOptions: AlphabetizeOptions,
) {
  const groupedByRanks = groupBy(imported, item => item.rank)

  const sorterFn = getSorter(alphabetizeOptions)

  // sort group keys so that they can be iterated on in order
  const groupRanks = Object.keys(groupedByRanks).sort((a, b) => +a - +b)

  // sort imports locally within their group
  groupRanks.forEach(groupRank => {
    groupedByRanks[groupRank].sort(sorterFn)
  })

  // assign globally unique rank to each import
  let newRank = 0
  const alphabetizedRanks = groupRanks.reduce<Record<string, number>>(
    (acc, groupRank) => {
      groupedByRanks[groupRank].forEach(importedItem => {
        acc[
          `${importedItem.value}|${'importKind' in importedItem.node ? importedItem.node.importKind : ''}`
        ] = parseInt(groupRank, 10) + newRank
        newRank += 1
      })
      return acc
    },
    {},
  )

  // mutate the original group-rank with alphabetized-rank
  imported.forEach(importedItem => {
    importedItem.rank =
      alphabetizedRanks[
        `${importedItem.value}|${'importKind' in importedItem.node ? importedItem.node.importKind : ''}`
      ]
  })
}

type Ranks = {
  omittedTypes: string[]
  groups: Record<string, number>
  pathGroups: Array<{
    pattern: string
    patternOptions?: MinimatchOptions
    group: string
    position?: number
  }>
  maxPosition: number
}

// DETECTING

function computePathRank(
  ranks: Ranks['groups'],
  pathGroups: Ranks['pathGroups'],
  path: string,
  maxPosition: number,
) {
  for (let i = 0, l = pathGroups.length; i < l; i++) {
    const { pattern, patternOptions, group, position = 1 } = pathGroups[i]
    if (minimatch(path, pattern, patternOptions || { nocomment: true })) {
      return ranks[group] + position / maxPosition
    }
  }
}

type ImportEntry = {
  type: 'import:object' | 'import' | 'require'
  node: TSESTree.Node
  value: string
  displayName: string
}

function computeRank(
  context: RuleContext,
  ranks: Ranks,
  importEntry: ImportEntry,
  excludedImportTypes: Set<ImportType>,
) {
  let impType: ImportType
  let rank
  if (importEntry.type === 'import:object') {
    impType = 'object'
  } else if (
    'importKind' in importEntry.node &&
    importEntry.node.importKind === 'type' &&
    !ranks.omittedTypes.includes('type')
  ) {
    impType = 'type'
  } else {
    impType = importType(importEntry.value, context)
  }
  if (!excludedImportTypes.has(impType)) {
    rank = computePathRank(
      ranks.groups,
      ranks.pathGroups,
      importEntry.value,
      ranks.maxPosition,
    )
  }
  if (typeof rank === 'undefined') {
    rank = ranks.groups[impType]
  }
  if (
    importEntry.type !== 'import' &&
    !importEntry.type.startsWith('import:')
  ) {
    rank += 100
  }

  return rank
}

function registerNode(
  context: RuleContext,
  importEntry: ImportEntry,
  ranks: Ranks,
  imported: ImportEntryWithRank[],
  excludedImportTypes: Set<ImportType>,
) {
  const rank = computeRank(context, ranks, importEntry, excludedImportTypes)
  if (rank !== -1) {
    imported.push({ ...importEntry, rank })
  }
}

function getRequireBlock(node: TSESTree.Node) {
  let n = node
  // Handle cases like `const baz = require('foo').bar.baz`
  // and `const foo = require('foo')()`
  while (
    n.parent &&
    ((n.parent.type === 'MemberExpression' && n.parent.object === n) ||
      (n.parent.type === 'CallExpression' && n.parent.callee === n))
  ) {
    n = n.parent
  }
  if (
    n.parent?.type === 'VariableDeclarator' &&
    n.parent.parent?.type === 'VariableDeclaration' &&
    n.parent.parent.parent?.type === 'Program'
  ) {
    return n.parent.parent.parent
  }
}

const types = [
  'builtin',
  'external',
  'internal',
  'unknown',
  'parent',
  'sibling',
  'index',
  'object',
  'type',
] as const

// Creates an object with type-rank pairs.
// Example: { index: 0, sibling: 1, parent: 1, external: 1, builtin: 2, internal: 2 }
// Will throw an error if it contains a type that does not exist, or has a duplicate
function convertGroupsToRanks(groups: ReadonlyArray<Arrayable<ImportType>>) {
  const rankObject = groups.reduce(
    (res, group, index) => {
      ;([group] as const).flat().forEach(groupItem => {
        if (!types.includes(groupItem)) {
          throw new Error(
            `Incorrect configuration of the rule: Unknown type \`${JSON.stringify(groupItem)}\``,
          )
        }
        if (res[groupItem] !== undefined) {
          throw new Error(
            `Incorrect configuration of the rule: \`${groupItem}\` is duplicated`,
          )
        }
        res[groupItem] = index * 2
      })
      return res
    },
    {} as Record<ImportType, number>,
  )

  const omittedTypes = types.filter(function (type) {
    return typeof rankObject[type] === 'undefined'
  })

  const ranks = omittedTypes.reduce(function (res, type) {
    res[type] = groups.length * 2
    return res
  }, rankObject)

  return { groups: ranks, omittedTypes }
}

function convertPathGroupsForRanks(pathGroups: PathGroup[]) {
  const after: Record<string, number> = {}
  const before: Record<string, number[]> = {}

  const transformed = pathGroups.map((pathGroup, index) => {
    const { group, position: positionString } = pathGroup
    let position = 0
    if (positionString === 'after') {
      if (!after[group]) {
        after[group] = 1
      }
      position = after[group]++
    } else if (positionString === 'before') {
      if (!before[group]) {
        before[group] = []
      }
      before[group].push(index)
    }

    return { ...pathGroup, position }
  })

  let maxPosition = 1

  Object.keys(before).forEach(group => {
    const groupLength = before[group].length
    before[group].forEach((groupIndex, index) => {
      transformed[groupIndex].position = -1 * (groupLength - index)
    })
    maxPosition = Math.max(maxPosition, groupLength)
  })

  Object.keys(after).forEach(key => {
    const groupNextPosition = after[key]
    maxPosition = Math.max(maxPosition, groupNextPosition - 1)
  })

  return {
    pathGroups: transformed,
    maxPosition:
      maxPosition > 10 ? Math.pow(10, Math.ceil(Math.log10(maxPosition))) : 10,
  }
}

function fixNewLineAfterImport(
  context: RuleContext,
  previousImport: ImportEntry,
) {
  const prevRoot = findRootNode(previousImport.node)
  const tokensToEndOfLine = takeTokensAfterWhile(
    context.getSourceCode(),
    prevRoot,
    commentOnSameLineAs(prevRoot),
  )

  let endOfLine = prevRoot.range[1]
  if (tokensToEndOfLine.length > 0) {
    endOfLine = tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1]
  }
  return (fixer: TSESLint.RuleFixer) =>
    fixer.insertTextAfterRange([prevRoot.range[0], endOfLine], '\n')
}

function removeNewLineAfterImport(
  context: RuleContext,
  currentImport: ImportEntry,
  previousImport: ImportEntry,
) {
  const sourceCode = context.getSourceCode()
  const prevRoot = findRootNode(previousImport.node)
  const currRoot = findRootNode(currentImport.node)
  const rangeToRemove = [
    findEndOfLineWithComments(sourceCode, prevRoot),
    findStartOfLineWithComments(sourceCode, currRoot),
  ] as const
  if (
    /^\s*$/.test(sourceCode.text.substring(rangeToRemove[0], rangeToRemove[1]))
  ) {
    return (fixer: TSESLint.RuleFixer) => fixer.removeRange(rangeToRemove)
  }
}

function makeNewlinesBetweenReport(
  context: RuleContext<MessageId>,
  imported: ImportEntryWithRank[],
  newlinesBetweenImports: Options['newlines-between'],
  distinctGroup?: boolean,
) {
  const getNumberOfEmptyLinesBetween = (
    currentImport: ImportEntryWithRank,
    previousImport: ImportEntryWithRank,
  ) => {
    const linesBetweenImports = context
      .getSourceCode()
      .lines.slice(
        previousImport.node.loc.end.line,
        currentImport.node.loc.start.line - 1,
      )

    return linesBetweenImports.filter(line => !line.trim().length).length
  }
  const getIsStartOfDistinctGroup = (
    currentImport: ImportEntryWithRank,
    previousImport: ImportEntryWithRank,
  ) => currentImport.rank - 1 >= previousImport.rank
  let previousImport = imported[0]

  imported.slice(1).forEach(currentImport => {
    const emptyLinesBetween = getNumberOfEmptyLinesBetween(
      currentImport,
      previousImport,
    )
    const isStartOfDistinctGroup = getIsStartOfDistinctGroup(
      currentImport,
      previousImport,
    )

    if (
      newlinesBetweenImports === 'always' ||
      newlinesBetweenImports === 'always-and-inside-groups'
    ) {
      if (
        currentImport.rank !== previousImport.rank &&
        emptyLinesBetween === 0
      ) {
        if (distinctGroup || (!distinctGroup && isStartOfDistinctGroup)) {
          context.report({
            node: previousImport.node,
            messageId: 'oneLineBetweenGroups',
            fix: fixNewLineAfterImport(context, previousImport),
          })
        }
      } else if (
        emptyLinesBetween > 0 &&
        newlinesBetweenImports !== 'always-and-inside-groups'
      ) {
        if (
          (distinctGroup && currentImport.rank === previousImport.rank) ||
          (!distinctGroup && !isStartOfDistinctGroup)
        ) {
          context.report({
            node: previousImport.node,
            messageId: 'noLineWithinGroup',
            fix: removeNewLineAfterImport(
              context,
              currentImport,
              previousImport,
            ),
          })
        }
      }
    } else if (emptyLinesBetween > 0) {
      context.report({
        node: previousImport.node,
        messageId: 'noLineBetweenGroups',
        fix: removeNewLineAfterImport(context, currentImport, previousImport),
      })
    }

    previousImport = currentImport
  })
}

function getAlphabetizeConfig(options: Options): AlphabetizeOptions {
  const alphabetize = options.alphabetize || {}
  const order = alphabetize.order || 'ignore'
  const orderImportKind = alphabetize.orderImportKind || 'ignore'
  const caseInsensitive = alphabetize.caseInsensitive || false
  return { order, orderImportKind, caseInsensitive }
}

// TODO, semver-major: Change the default of "distinctGroup" from true to false
const defaultDistinctGroup = true

type Options = {
  'newlines-between'?:
    | 'always'
    | 'always-and-inside-groups'
    | 'ignore'
    | 'never'
  alphabetize?: Partial<AlphabetizeOptions>
  distinctGroup?: boolean
  groups?: ReadonlyArray<Arrayable<ImportType>>
  pathGroupsExcludedImportTypes?: ImportType[]
  pathGroups?: PathGroup[]
  warnOnUnassignedImports?: boolean
}

type MessageId =
  | 'error'
  | 'noLineWithinGroup'
  | 'noLineBetweenGroups'
  | 'oneLineBetweenGroups'
  | 'order'

export = createRule<[Options?], MessageId>({
  name: 'order',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description: 'Enforce a convention in module import order.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
          },
          pathGroupsExcludedImportTypes: {
            type: 'array',
          },
          distinctGroup: {
            type: 'boolean',
            default: defaultDistinctGroup,
          },
          pathGroups: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                },
                patternOptions: {
                  type: 'object',
                },
                group: {
                  type: 'string',
                  enum: types,
                },
                position: {
                  type: 'string',
                  enum: ['after', 'before'],
                },
              },
              additionalProperties: false,
              required: ['pattern', 'group'],
            },
          },
          'newlines-between': {
            enum: ['ignore', 'always', 'always-and-inside-groups', 'never'],
          },
          alphabetize: {
            type: 'object',
            properties: {
              caseInsensitive: {
                type: 'boolean',
                default: false,
              },
              order: {
                enum: ['ignore', 'asc', 'desc'],
                default: 'ignore',
              },
              orderImportKind: {
                enum: ['ignore', 'asc', 'desc'],
                default: 'ignore',
              },
            },
            additionalProperties: false,
          },
          warnOnUnassignedImports: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      error: '{{error}}',
      noLineWithinGroup: 'There should be no empty line within import group',
      noLineBetweenGroups:
        'There should be no empty line between import groups',
      oneLineBetweenGroups:
        'There should be at least one empty line between import groups',
      order: '{{secondImport}} should occur {{order}} {{firstImport}}',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}
    const newlinesBetweenImports = options['newlines-between'] || 'ignore'
    const pathGroupsExcludedImportTypes = new Set<ImportType>(
      options.pathGroupsExcludedImportTypes || [
        'builtin',
        'external',
        'object',
      ],
    )
    const alphabetize = getAlphabetizeConfig(options)
    const distinctGroup =
      options.distinctGroup == null
        ? defaultDistinctGroup
        : !!options.distinctGroup

    let ranks: Ranks

    try {
      const { pathGroups, maxPosition } = convertPathGroupsForRanks(
        options.pathGroups || [],
      )
      const { groups, omittedTypes } = convertGroupsToRanks(
        options.groups || defaultGroups,
      )
      ranks = {
        groups,
        omittedTypes,
        pathGroups,
        maxPosition,
      }
    } catch (error) {
      // Malformed configuration
      return {
        Program(node) {
          context.report({
            node,
            messageId: 'error',
            data: {
              error: (error as Error).message,
            },
          })
        },
      }
    }

    const importMap = new Map<TSESTree.Node, ImportEntryWithRank[]>()

    function getBlockImports(node: TSESTree.Node) {
      if (!importMap.has(node)) {
        importMap.set(node, [])
      }
      return importMap.get(node)!
    }

    return {
      ImportDeclaration(node) {
        // Ignoring unassigned imports unless warnOnUnassignedImports is set
        if (node.specifiers.length || options.warnOnUnassignedImports) {
          const name = node.source.value
          registerNode(
            context,
            {
              node,
              value: name,
              displayName: name,
              type: 'import',
            },
            ranks,
            getBlockImports(node.parent!),
            pathGroupsExcludedImportTypes,
          )
        }
      },
      TSImportEqualsDeclaration(node) {
        let displayName: string
        let value: string
        let type: 'import:object' | 'import'
        // skip "export import"s
        if (node.isExport) {
          return
        }
        if (
          node.moduleReference.type === 'TSExternalModuleReference' &&
          'value' in node.moduleReference.expression &&
          typeof node.moduleReference.expression.value === 'string'
        ) {
          value = node.moduleReference.expression.value
          displayName = value
          type = 'import'
        } else {
          value = ''
          displayName = context.getSourceCode().getText(node.moduleReference)
          type = 'import:object'
        }
        registerNode(
          context,
          {
            node,
            value,
            displayName,
            type,
          },
          ranks,
          getBlockImports(node.parent!),
          pathGroupsExcludedImportTypes,
        )
      },
      CallExpression(node) {
        if (!isStaticRequire(node)) {
          return
        }
        const block = getRequireBlock(node)
        const firstArg = node.arguments[0]
        if (
          !block ||
          !('value' in firstArg) ||
          typeof firstArg.value !== 'string'
        ) {
          return
        }
        const name = firstArg.value
        registerNode(
          context,
          {
            node,
            value: name,
            displayName: name,
            type: 'require',
          },
          ranks,
          getBlockImports(block),
          pathGroupsExcludedImportTypes,
        )
      },
      'Program:exit': function reportAndReset() {
        importMap.forEach(imported => {
          if (newlinesBetweenImports !== 'ignore') {
            makeNewlinesBetweenReport(
              context,
              imported,
              newlinesBetweenImports,
              distinctGroup,
            )
          }

          if (alphabetize.order !== 'ignore') {
            mutateRanksToAlphabetize(imported, alphabetize)
          }

          makeOutOfOrderReport(context, imported)
        })

        importMap.clear()
      },
    }
  },
})
