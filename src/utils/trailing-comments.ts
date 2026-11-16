import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

/**
 * The comments that start on the node's final line, including comments chained
 * onto the line where a previous one ends.
 */
export function getTrailingComments(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node | TSESTree.Token,
) {
  const comments: TSESTree.Comment[] = []
  let last: TSESTree.Node | TSESTree.Token = node
  let next = sourceCode.getTokenAfter(node, { includeComments: true })
  while (
    next &&
    (next.type === 'Line' || next.type === 'Block') &&
    next.loc.start.line === last.loc.end.line
  ) {
    comments.push(next)
    last = next
    next = sourceCode.getTokenAfter(next, { includeComments: true })
  }
  return comments
}

/**
 * The comments on the lines right above the node, each alone on its line, with
 * no blank line between them and the node, in source order.
 */
export function getLeadingComments(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node | TSESTree.Token,
) {
  const comments: TSESTree.Comment[] = []
  let below: TSESTree.Node | TSESTree.Token = node
  let prev = sourceCode.getTokenBefore(node, { includeComments: true })
  while (
    prev &&
    (prev.type === 'Line' || prev.type === 'Block') &&
    prev.loc.end.line === below.loc.start.line - 1
  ) {
    const before = sourceCode.getTokenBefore(prev, { includeComments: true })
    if (before && before.loc.end.line === prev.loc.start.line) {
      break
    }
    // @ts-nocheck and @ts-check are TypeScript file-level pragmas; they must
    // appear before any code and must not move with an import below them.
    if (!before && /^\s*@ts-(no)?check\b/.test(prev.value)) {
      break
    }
    comments.unshift(prev)
    below = prev
    prev = before
  }
  return comments
}
