import type { TSESTree } from '@typescript-eslint/utils'

// A line-scoped directive applies to the line after its own; moving code
// between the two would retarget it.
export const LINE_SCOPED_DIRECTIVE =
  /^\s*[*/]*\s*(?:eslint-disable-next-line|@ts-ignore|@ts-expect-error)(?:\s|$)/

/** Whether a token or comment is a line-scoped directive. */
export function isLineScopedDirective(token: TSESTree.Node | TSESTree.Token) {
  return (
    (token.type === 'Line' || token.type === 'Block') &&
    LINE_SCOPED_DIRECTIVE.test(token.value)
  )
}
