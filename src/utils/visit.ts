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

  childFields.forEach(fieldName => {
    ;[node[fieldName]].flat().forEach(item => {
      if (!item || typeof item !== 'object' || !('type' in item)) {
        return
      }
      visit(item, keys, visitorSpec)
    })
  })

  const exit = visitorSpec[`${type}:Exit`]

  if (typeof exit === 'function') {
    exit(node)
  }
}
