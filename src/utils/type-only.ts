import type { TSESTree } from '@typescript-eslint/utils'

/**
 * Whether an import/export declaration is type-only. Inline `type` specifiers
 * count, so `import { type T }` is type-only while a mixed declaration is not.
 */
export function isTypeOnlyImportOrExport(node: TSESTree.Node) {
  if (
    'importKind' in node &&
    (node.importKind === 'type' ||
      // @ts-expect-error - flow type
      node.importKind === 'typeof')
  ) {
    return true
  }
  if ('exportKind' in node && node.exportKind === 'type') {
    return true
  }
  if (
    !('specifiers' in node) ||
    !Array.isArray(node.specifiers) ||
    node.specifiers.length === 0
  ) {
    return false
  }
  return (
    node.specifiers as Array<TSESTree.ExportSpecifier | TSESTree.ImportClause>
  ).every(specifier => {
    if ('importKind' in specifier) {
      return (
        specifier.importKind === 'type' ||
        // @ts-expect-error - flow type
        specifier.importKind === 'typeof'
      )
    }
    if ('exportKind' in specifier) {
      return specifier.exportKind === 'type'
    }
    return false
  })
}
