import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

/**
 * The comments that start on the node's final line, including comments chained
 * onto the line where a previous one ends.
 */
export function getTrailingComments(
  sourceCode: TSESLint.SourceCode,
  node: TSESTree.Node,
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
