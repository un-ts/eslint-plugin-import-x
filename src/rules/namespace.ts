import type { TSESTree, TSESLint } from '@typescript-eslint/utils'

import {
  importDeclaration,
  ExportMap,
  createRule,
  declaredScope,
  getValue,
} from '../utils/index.js'

export type MessageId =
  | 'noNamesFound'
  | 'computedReference'
  | 'namespaceMember'
  | 'topLevelNames'
  | 'notFoundInNamespace'
  | 'notFoundInNamespaceDeep'

export interface Options {
  allowComputed?: boolean
}

function processBodyStatement(
  context: TSESLint.RuleContext<MessageId, [Options]>,
  namespaces: Map<string, ExportMap | null>,
  declaration: TSESTree.ProgramStatement,
) {
  if (declaration.type !== 'ImportDeclaration') {
    return
  }

  if (declaration.specifiers.length === 0) {
    return
  }

  const imports = ExportMap.get(declaration.source.value, context)

  if (imports == null) {
    return
  }

  if (imports.errors.length > 0) {
    imports.reportErrors(context, declaration)
    return
  }

  for (const specifier of declaration.specifiers) {
    switch (specifier.type) {
      case 'ImportNamespaceSpecifier': {
        if (imports.size === 0) {
          context.report({
            node: specifier,
            messageId: 'noNamesFound',
            data: {
              module: declaration.source.value,
            },
          })
        }
        namespaces.set(specifier.local.name, imports)
        break
      }
      case 'ImportDefaultSpecifier':
      case 'ImportSpecifier': {
        const meta = imports.get(
          'imported' in specifier
            ? getValue(specifier.imported)
            : // default to 'default' for default
              'default',
        )
        if (!meta || !meta.namespace) {
          break
        }
        namespaces.set(specifier.local.name, meta.namespace)
        break
      }
      default:
    }
  }
}

function makeMessage(
  last:
    | TSESTree.Identifier
    | TSESTree.PrivateIdentifier
    | TSESTree.JSXIdentifier,
  namepath: string[],
  node: TSESTree.Node = last,
) {
  const messageId =
    namepath.length > 1 ? 'notFoundInNamespaceDeep' : 'notFoundInNamespace'
  return {
    node,
    messageId,
    data: {
      name: last.name,
      namepath: namepath.join('.'),
    },
  } as const
}

export default createRule<[Options], MessageId>({
  name: 'namespace',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description:
        'Ensure imported namespaces contain dereferenced properties as they are dereferenced.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowComputed: {
            description:
              'If `false`, will report computed (and thus, un-lintable) references to namespace members.',
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noNamesFound: "No exported names found in module '{{module}}'.",
      computedReference:
        "Unable to validate computed reference to imported namespace '{{namespace}}'.",
      namespaceMember: "Assignment to member of namespace '{{namespace}}'.",
      topLevelNames: 'Only destructure top-level names.',
      notFoundInNamespace:
        "'{{name}}' not found in imported namespace '{{namepath}}'.",
      notFoundInNamespaceDeep:
        "'{{name}}' not found in deeply imported namespace '{{namepath}}'.",
    },
  },
  defaultOptions: [
    {
      allowComputed: false,
    },
  ],
  create(context) {
    // read options
    const { allowComputed } = context.options[0] || {}

    const namespaces = new Map<string, ExportMap | null>()

    return {
      // pick up all imports at body entry time, to properly respect hoisting
      Program({ body }) {
        for (const x of body) {
          processBodyStatement(context, namespaces, x)
        }
      },

      // same as above, but does not add names to local map
      ExportNamespaceSpecifier(namespace) {
        const declaration = importDeclaration(
          context,
          namespace as TSESTree.ImportDefaultSpecifier,
        )

        const imports = ExportMap.get(declaration.source.value, context)
        if (imports == null) {
          return null
        }

        if (imports.errors.length > 0) {
          imports.reportErrors(context, declaration)
          return
        }

        if (imports.size === 0) {
          context.report({
            node: namespace,
            messageId: 'noNamesFound',
            data: {
              module: declaration.source.value,
            },
          })
        }
      },

      // todo: check for possible redefinition

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

        const parent = dereference!.parent

        if (
          parent?.type === 'AssignmentExpression' &&
          parent.left === dereference
        ) {
          context.report({
            node: parent,
            messageId: 'namespaceMember',
            data: {
              namespace: dereference.object.name,
            },
          })
        }

        // go deep
        let namespace = namespaces.get(dereference.object.name)

        const namepath = [dereference.object.name]

        let deref: TSESTree.Node | undefined = dereference

        // while property is namespace and parent is member expression, keep validating
        while (
          namespace instanceof ExportMap &&
          deref?.type === 'MemberExpression'
        ) {
          if (deref.computed) {
            if (!allowComputed) {
              context.report({
                node: deref.property,
                messageId: 'computedReference',
                data: {
                  namespace: 'name' in deref.object && deref.object.name,
                },
              })
            }
            return
          }

          if (!namespace.has(deref.property.name)) {
            context.report(makeMessage(deref.property, namepath))
            break
          }

          const exported = namespace.get(deref.property.name)

          if (exported == null) {
            return
          }

          // stash and pop
          namepath.push(deref.property.name)
          namespace = exported.namespace

          deref = deref.parent
        }
      },

      VariableDeclarator(node) {
        const { id, init } = node

        if (init == null) {
          return
        }
        if (init.type !== 'Identifier') {
          return
        }
        if (!namespaces.has(init.name)) {
          return
        }

        // check for redefinition in intermediate scopes
        if (declaredScope(context, node, init.name) !== 'module') {
          return
        }

        const initName = init.name

        // DFS traverse child namespaces
        function testKey(
          pattern: TSESTree.Node,
          namespace?: ExportMap | null,
          path: string[] = [initName],
        ) {
          if (!(namespace instanceof ExportMap)) {
            return
          }

          if (pattern.type !== 'ObjectPattern') {
            return
          }

          for (const property of pattern.properties) {
            if (
              // @ts-expect-error - experimental type
              property.type === 'ExperimentalRestProperty' ||
              property.type === 'RestElement' ||
              !property.key
            ) {
              continue
            }

            if (property.key.type !== 'Identifier') {
              context.report({
                node: property,
                messageId: 'topLevelNames',
              })
              continue
            }

            if (!namespace.has(property.key.name)) {
              context.report(makeMessage(property.key, path, property))
              continue
            }

            path.push(property.key.name)

            const dependencyExportMap = namespace.get(property.key.name)

            // could be null when ignored or ambiguous
            if (dependencyExportMap != null) {
              testKey(property.value, dependencyExportMap.namespace, path)
            }

            path.pop()
          }
        }

        testKey(id, namespaces.get(init.name))
      },

      JSXMemberExpression({ object, property }) {
        if (
          !('name' in object) ||
          typeof object.name !== 'string' ||
          !namespaces.has(object.name)
        ) {
          return
        }

        const namespace = namespaces.get(object.name)!

        if (!namespace.has(property.name)) {
          context.report(makeMessage(property, [object.name]))
        }
      },
    }
  },
})
