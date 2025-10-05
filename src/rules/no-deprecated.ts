import type { TSESTree } from '@typescript-eslint/utils'
import type { Spec } from 'comment-parser'

import type { ModuleNamespace } from '../utils/index.js'
import {
  ExportMap,
  createRule,
  declaredScope,
  getValue,
} from '../utils/index.js'

function message(deprecation: Spec) {
  if (deprecation.description) {
    return {
      messageId: 'deprecatedDesc',
      data: { description: deprecation.description },
    } as const
  }

  return { messageId: 'deprecated' } as const
}

function getDeprecation(metadata?: ModuleNamespace | null) {
  if (!metadata || !metadata.doc) {
    return
  }

  return metadata.doc.tags.find(t => t.tag === 'deprecated')
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
    const deprecated = new Map<string, Spec>()
    const namespaces = new Map<string, ExportMap | null>()

    return {
      Program({ body }) {
        for (const node of body) {
          if (node.type !== 'ImportDeclaration') {
            continue
          }

          if (node.source == null) {
            continue
          } // local export, ignore

          const imports = ExportMap.get(node.source.value, context)

          if (imports == null) {
            continue
          }

          const moduleDeprecation = imports.doc?.tags.find(
            t => t.tag === 'deprecated',
          )
          if (moduleDeprecation) {
            context.report({
              node,
              ...message(moduleDeprecation),
            })
          }

          if (imports.errors.length > 0) {
            imports.reportErrors(context, node)
            continue
          }

          for (const im of node.specifiers) {
            let imported: string
            let local: string
            switch (im.type) {
              case 'ImportNamespaceSpecifier': {
                if (imports.size === 0) {
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
            const exported = imports.get(imported)
            if (exported == null) {
              continue
            }

            // capture import of deep namespace
            if (exported.namespace) {
              namespaces.set(local, exported.namespace)
            }

            const deprecation = getDeprecation(imports.get(imported))

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
          namespace instanceof ExportMap &&
          node?.type === 'MemberExpression'
        ) {
          // ignore computed parts for now
          if (node.computed) {
            return
          }

          const metadata = namespace.get(node.property.name)

          if (!metadata) {
            break
          }

          const deprecation = getDeprecation(metadata)

          if (deprecation) {
            context.report({
              node: node.property,
              ...message(deprecation),
            })
          }

          // stash and pop
          namepath.push(node.property.name)
          namespace = metadata.namespace
          node = node.parent
        }
      },
    }
  },
})
