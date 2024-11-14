import path from 'node:path'

import type { FileExtension, RuleContext } from '../types'
import {
  isBuiltIn,
  isExternalModule,
  isScoped,
  createRule,
  moduleVisitor,
  resolve,
} from '../utils'

const modifierValues = ['always', 'ignorePackages', 'never'] as const

const modifierSchema = {
  type: 'string' as const,
  enum: [...modifierValues],
}

const modifierByFileExtensionSchema = {
  type: 'object' as const,
  patternProperties: { '.*': modifierSchema },
}

const properties = {
  type: 'object' as const,
  properties: {
    pattern: modifierByFileExtensionSchema,
    ignorePackages: {
      type: 'boolean' as const,
    },
    checkTypeImports: {
      type: 'boolean' as const,
    },
  },
}

type Modifier = (typeof modifierValues)[number]

type ModifierByFileExtension = Partial<Record<string, Modifier>>

type OptionsItemWithPatternProperty = {
  ignorePackages?: boolean
  checkTypeImports?: boolean
  pattern: ModifierByFileExtension
}

type OptionsItemWithoutPatternProperty = {
  ignorePackages?: boolean
  checkTypeImports?: boolean
}

type Options =
  | []
  | [Modifier]
  | [Modifier, OptionsItemWithoutPatternProperty]
  | [Modifier, OptionsItemWithPatternProperty]
  | [Modifier, ModifierByFileExtension]
  | [ModifierByFileExtension]

type NormalizedOptions = {
  defaultConfig?: Modifier
  pattern?: Record<string, Modifier>
  ignorePackages?: boolean
  checkTypeImports?: boolean
}

type MessageId = 'missing' | 'missingKnown' | 'unexpected'

function buildProperties(context: RuleContext<MessageId, Options>) {
  const result: Required<NormalizedOptions> = {
    defaultConfig: 'never',
    pattern: {},
    ignorePackages: false,
    checkTypeImports: false,
  }

  for (const obj of context.options) {
    // If this is a string, set defaultConfig to its value
    if (typeof obj === 'string') {
      result.defaultConfig = obj
      continue
    }

    if (typeof obj !== 'object' || !obj) {
      continue
    }

    // If this is not the new structure, transfer all props to result.pattern
    if (
      (!('pattern' in obj) || obj.pattern === undefined) &&
      obj.ignorePackages === undefined &&
      obj.checkTypeImports === undefined
    ) {
      Object.assign(result.pattern, obj)
      continue
    }

    // If pattern is provided, transfer all props
    if ('pattern' in obj && obj.pattern !== undefined) {
      Object.assign(result.pattern, obj.pattern)
    }

    // If ignorePackages is provided, transfer it to result
    if (typeof obj.ignorePackages === 'boolean') {
      result.ignorePackages = obj.ignorePackages
    }

    if (typeof obj.checkTypeImports === 'boolean') {
      result.checkTypeImports = obj.checkTypeImports
    }
  }

  if (result.defaultConfig === 'ignorePackages') {
    result.defaultConfig = 'always'
    result.ignorePackages = true
  }

  return result
}

function isExternalRootModule(file: string) {
  if (file === '.' || file === '..') {
    return false
  }
  const slashCount = file.split('/').length - 1

  if (slashCount === 0) {
    return true
  }
  if (isScoped(file) && slashCount <= 1) {
    return true
  }
  return false
}

export = createRule<Options, MessageId>({
  name: 'extensions',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description:
        'Ensure consistent use of file extension within the import path.',
    },
    schema: {
      anyOf: [
        {
          type: 'array',
          items: [modifierSchema],
          additionalItems: false,
        },
        {
          type: 'array',
          items: [modifierSchema, properties],
          additionalItems: false,
        },
        {
          type: 'array',
          items: [properties],
          additionalItems: false,
        },
        {
          type: 'array',
          items: [modifierSchema, modifierByFileExtensionSchema],
          additionalItems: false,
        },
        {
          type: 'array',
          items: [modifierByFileExtensionSchema],
          additionalItems: false,
        },
      ],
    },
    messages: {
      missing: 'Missing file extension for "{{importPath}}"',
      missingKnown:
        'Missing file extension "{{extension}}" for "{{importPath}}"',
      unexpected:
        'Unexpected use of file extension "{{extension}}" for "{{importPath}}"',
    },
  },
  defaultOptions: [],
  create(context) {
    const props = buildProperties(context)

    function getModifier(extension: FileExtension) {
      return props.pattern[extension] || props.defaultConfig
    }

    function isUseOfExtensionRequired(
      extension: FileExtension,
      isPackage: boolean,
    ) {
      return (
        getModifier(extension) === 'always' &&
        (!props.ignorePackages || !isPackage)
      )
    }

    function isUseOfExtensionForbidden(extension: FileExtension) {
      return getModifier(extension) === 'never'
    }

    function isResolvableWithoutExtension(file: string) {
      const extension = path.extname(file)
      const fileWithoutExtension = file.slice(0, -extension.length)
      const resolvedFileWithoutExtension = resolve(
        fileWithoutExtension,
        context,
      )
      return resolvedFileWithoutExtension === resolve(file, context)
    }

    return moduleVisitor(
      (source, node) => {
        // bail if the declaration doesn't have a source, e.g. "export { foo };", or if it's only partially typed like in an editor
        if (!source || !source.value) {
          return
        }

        const importPathWithQueryString = source.value

        // don't enforce anything on builtins
        if (isBuiltIn(importPathWithQueryString, context.settings)) {
          return
        }

        const importPath = importPathWithQueryString.replace(/\?(.*)$/, '')

        // don't enforce in root external packages as they may have names with `.js`.
        // Like `import Decimal from decimal.js`)
        if (isExternalRootModule(importPath)) {
          return
        }

        const resolvedPath = resolve(importPath, context)

        // get extension from resolved path, if possible.
        // for unresolved, use source value.
        const extension = path
          .extname(resolvedPath || importPath)
          .slice(1) as FileExtension

        // determine if this is a module
        const isPackage =
          isExternalModule(
            importPath,
            resolve(importPath, context)!,
            context,
          ) || isScoped(importPath)

        if (!extension || !importPath.endsWith(`.${extension}`)) {
          // ignore type-only imports and exports
          if (
            !props.checkTypeImports &&
            (('importKind' in node && node.importKind === 'type') ||
              ('exportKind' in node && node.exportKind === 'type'))
          ) {
            return
          }
          const extensionRequired = isUseOfExtensionRequired(
            extension,
            isPackage,
          )
          const extensionForbidden = isUseOfExtensionForbidden(extension)
          if (extensionRequired && !extensionForbidden) {
            context.report({
              node: source,
              messageId: extension ? 'missingKnown' : 'missing',
              data: {
                extension,
                importPath: importPathWithQueryString,
              },
            })
          }
        } else if (
          extension &&
          isUseOfExtensionForbidden(extension) &&
          isResolvableWithoutExtension(importPath)
        ) {
          context.report({
            node: source,
            messageId: 'unexpected',
            data: {
              extension,
              importPath: importPathWithQueryString,
            },
          })
        }
      },
      { commonjs: true },
    )
  },
})
