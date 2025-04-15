import type { TSESTree } from '@typescript-eslint/utils'

const pattern = /(^|;)\s*(export|import)((\s+\w)|(\s*[*={]))|import\(/m
/**
 * Detect possible imports/exports without a full parse.
 *
 * A negative test means that a file is definitely _not_ a module.
 *
 * A positive test means it _could_ be.
 *
 * Not perfect, just a fast way to disqualify large non-ES6 modules and avoid a
 * parse.
 */
export function isMaybeUnambiguousModule(content: string) {
  return pattern.test(content)
}

// future-/Babel-proof at the expense of being a little loose
const unambiguousNodeType =
  /^(?:(?:Exp|Imp)ort.*Declaration|TSExportAssignment)$/

/** Given an AST, return true if the AST unambiguously represents a module. */
export function isUnambiguousModule(ast: TSESTree.Program) {
  return ast.body && ast.body.some(node => unambiguousNodeType.test(node.type))
}
