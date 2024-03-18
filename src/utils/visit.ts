import type { TSESTree } from '@typescript-eslint/utils'

export function visit(
  node: TSESTree.Node,
  keys: { [k in TSESTree.Node['type']]?: Array<keyof TSESTree.Node> } | null,
  visitorSpec: {
    [k in TSESTree.Node['type'] | `${TSESTree.Node['type']}:Exit`]?: (
      node: TSESTree.Node,
    ) => void
  },
) {
  if (!node || !keys) {
    return
  }

  const type = node.type
  const visitor = visitorSpec[type]
  if (typeof visitor === 'function') {
    visitor(node)
  }

  const childFields = keys[type]
  if (!childFields) {
    return
  }

  for (const fieldName of childFields) {
    for (const item of [node[fieldName]].flat()) {
      if (!item || typeof item !== 'object' || !('type' in item)) {
        continue
      }
      visit(item, keys, visitorSpec)
    }
  }

  const exit = visitorSpec[`${type}:Exit`]

  if (typeof exit === 'function') {
    exit(node)
  }
}
