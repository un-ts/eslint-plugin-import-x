import type { TSESTree } from '@typescript-eslint/utils'

import type { DocCommentBlock } from '../core/index.js'
import { getExportDoc, getModuleDoc, ModuleInfo } from '../core/index.js'
import { createRule, declaredScope, getValue } from '../utils/index.js'
import { reportModuleParseErrors } from '../utils/report-module-parse-errors.js'

/**
 * This rule is the only consumer of doc comments, so `@deprecated` handling
 * lives here — the core only hands over raw doc blocks via its tier-2
 * `getModuleDoc()`/`getExportDoc()` accessors.
 */
interface DeprecationInfo {
  description: string
}

function findDeprecationTag(
  doc: DocCommentBlock | undefined,
): DeprecationInfo | undefined {
  const tag = doc?.tags.find(t => t.tag === 'deprecated')
  return tag ? { description: tag.description } : undefined
}

function getModuleDeprecation(moduleInfo: ModuleInfo) {
  return findDeprecationTag(getModuleDoc(moduleInfo))
}

function getExportDeprecation(moduleInfo: ModuleInfo, name: string) {
  return findDeprecationTag(getExportDoc(moduleInfo, name))
}

function message(deprecation: DeprecationInfo) {
  if (deprecation.description) {
    return {
      messageId: 'deprecatedDesc',
      data: { description: deprecation.description },
    } as const
  }

  return { messageId: 'deprecated' } as const
}

export default createRule({
  name: 'no-deprecated',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Helpful warnings',
      description:
        'Forbid imported names marked with `@deprecated` documentation tag.',
    },
    schema: [],
    messages: {
      deprecatedDesc: 'Deprecated: {{description}}',
      deprecated: 'Deprecated: consider to find an alternative.',
    },
  },
  defaultOptions: [],
  create(context) {
    const deprecated = new Map<string, DeprecationInfo>()
    const namespaces = new Map<string, ModuleInfo | null>()

    return {
      Program({ body }) {
        for (const node of body) {
          if (node.type !== 'ImportDeclaration') {
            continue
          }

          if (node.source == null) {
            continue
          } // local export, ignore

          const imports = ModuleInfo.get(node.source.value, context)

          if (imports == null) {
            continue
          }

          const moduleDeprecation = getModuleDeprecation(imports)
          if (moduleDeprecation) {
            context.report({
              node,
              ...message(moduleDeprecation),
            })
          }

          if (imports.parseError) {
            reportModuleParseErrors(context, imports, node)
            continue
          }

          for (const im of node.specifiers) {
            let imported: string
            let local: string
            switch (im.type) {
              case 'ImportNamespaceSpecifier': {
                if (!imports.hasExports) {
                  continue
                }
                namespaces.set(im.local.name, imports)
                continue
              }

              case 'ImportDefaultSpecifier': {
                imported = 'default'
                local = im.local.name
                break
              }

              case 'ImportSpecifier': {
                imported = getValue(im.imported)
                local = im.local.name
                break
              }

              default: {
                continue
              } // can't handle this one
            }

            // unknown thing can't be deprecated
            const exported = imports.getExport(imported)
            if (exported == null) {
              continue
            }

            // capture import of deep namespace
            const exportedNamespace = exported.getNamespace?.()
            if (exportedNamespace) {
              namespaces.set(local, exportedNamespace)
            }

            const deprecation = getExportDeprecation(imports, imported)

            if (!deprecation) {
              continue
            }

            context.report({
              node: im,
              ...message(deprecation),
            })

            deprecated.set(local, deprecation)
          }
        }
      },

      Identifier(node) {
        if (
          !node.parent ||
          (node.parent.type === 'MemberExpression' &&
            node.parent.property === node)
        ) {
          return // handled by MemberExpression
        }

        // ignore specifier identifiers
        if (node.parent.type.slice(0, 6) === 'Import') {
          return
        }

        if (!deprecated.has(node.name)) {
          return
        }

        if (declaredScope(context, node, node.name) !== 'module') {
          return
        }
        context.report({
          node,
          ...message(deprecated.get(node.name)!),
        })
      },

      MemberExpression(dereference) {
        if (dereference.object.type !== 'Identifier') {
          return
        }
        if (!namespaces.has(dereference.object.name)) {
          return
        }

        if (
          declaredScope(context, dereference, dereference.object.name) !==
          'module'
        ) {
          return
        }

        // go deep
        let namespace = namespaces.get(dereference.object.name)
        const namepath = [dereference.object.name]

        let node: TSESTree.Node | undefined = dereference

        // while property is namespace and parent is member expression, keep validating
        while (
          namespace instanceof ModuleInfo &&
          node?.type === 'MemberExpression'
        ) {
          // ignore computed parts for now
          if (node.computed) {
            return
          }

          const metadata = namespace.getExport(node.property.name)

          if (!metadata) {
            break
          }

          const deprecation = getExportDeprecation(
            namespace,
            node.property.name,
          )

          if (deprecation) {
            context.report({
              node: node.property,
              ...message(deprecation),
            })
          }

          // stash and pop
          namepath.push(node.property.name)
          namespace = metadata.getNamespace?.()
          node = node.parent
        }
      },
    }
  },
})
