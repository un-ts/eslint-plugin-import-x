import type { TSESTree } from '@typescript-eslint/utils'

/**
 * Traverse a pattern/identifier node, calling 'callback' for each leaf
 * identifier.
 */
export function recursivePatternCapture(
  pattern: TSESTree.Node,
  callback: (node: TSESTree.DestructuringPattern) => void,
) {
  switch (pattern.type) {
    case 'Identifier': {
      // base case
      callback(pattern)
      break
    }
    case 'ObjectPattern': {
      for (const p of pattern.properties) {
        if (
          // @ts-expect-error - legacy experimental
          p.type === 'ExperimentalRestProperty' ||
          p.type === 'RestElement'
        ) {
          // object rest targets are identifiers per spec; recurse
          // defensively so a non-standard parser can't leak a pattern
          recursivePatternCapture(p.argument, callback)
          continue
        }
        recursivePatternCapture(p.value, callback)
      }
      break
    }
    case 'ArrayPattern': {
      for (const element of pattern.elements) {
        if (element == null) {
          continue
        }
        if (
          // @ts-expect-error - legacy experimental
          element.type === 'ExperimentalRestProperty' ||
          element.type === 'RestElement'
        ) {
          // an array rest target may itself destructure: `[...[a, b]]`
          recursivePatternCapture(element.argument, callback)
          continue
        }
        recursivePatternCapture(element, callback)
      }
      break
    }
    case 'AssignmentPattern': {
      // a default value wraps another pattern: `[{ a } = {}]`
      recursivePatternCapture(pattern.left, callback)
      break
    }
    default:
  }
}
