import path from 'node:path'

import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema'
import type { RuleFixer } from '@typescript-eslint/utils/ts-eslint'
import { minimatch } from 'minimatch'
import type { MinimatchOptions } from 'minimatch'

import type { FileExtension, RuleContext } from '../types.js'
import {
  isBuiltIn,
  isExternalModule,
  isScoped,
  createRule,
  moduleVisitor,
  resolve,
  parsePath,
  stringifyPath,
} from '../utils/index.js'

const modifierValues = ['always', 'ignorePackages', 'never'] as const

const modifierSchema = {
  type: 'string',
  enum: [...modifierValues],
} satisfies JSONSchema4

const modifierByFileExtensionSchema = {
  type: 'object',
  patternProperties: { '.*': modifierSchema },
} satisfies JSONSchema4

const properties = {
  type: 'object',
  properties: {
    pattern: modifierByFileExtensionSchema,
    ignorePackages: {
      type: 'boolean',
    },
    checkTypeImports: {
      type: 'boolean',
    },
    pathGroupOverrides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          patternOptions: { type: 'object' },
          action: {
            type: 'string',
            enum: ['enforce', 'ignore'],
          },
        },
        additionalProperties: false,
        required: ['pattern', 'action'],
      },
    },
    fix: {
      type: 'boolean',
    },
  },
} satisfies JSONSchema4

export type Modifier = (typeof modifierValues)[number]

export type ModifierByFileExtension = Partial<Record<string, Modifier>>

export interface OptionsItemWithPatternProperty {
  ignorePackages?: boolean
  checkTypeImports?: boolean
  pattern: ModifierByFileExtension
  pathGroupOverrides?: PathGroupOverride[]
  fix?: boolean
}

export interface PathGroupOverride {
  pattern: string
  patternOptions?: Record<string, MinimatchOptions>
  action: 'enforce' | 'ignore'
}

export interface OptionsItemWithoutPatternProperty {
  ignorePackages?: boolean
  checkTypeImports?: boolean
  pathGroupOverrides?: PathGroupOverride[]
  fix?: boolean
}

export type Options =
  | []
  | [OptionsItemWithoutPatternProperty]
  | [OptionsItemWithPatternProperty]
  | [Modifier]
  | [Modifier, OptionsItemWithoutPatternProperty]
  | [Modifier, OptionsItemWithPatternProperty]
  | [Modifier, ModifierByFileExtension]
  | [ModifierByFileExtension]

export interface NormalizedOptions {
  defaultConfig?: Modifier
  pattern?: Record<string, Modifier>
  ignorePackages?: boolean
  checkTypeImports?: boolean
  pathGroupOverrides?: PathGroupOverride[]
  fix?: boolean
}

export type MessageId = 'missing' | 'missingKnown' | 'unexpected' | 'addMissing'

function buildProperties(context: RuleContext<MessageId, Options>) {
  const result: Required<NormalizedOptions> = {
    defaultConfig: 'never',
    pattern: {},
    ignorePackages: false,
    checkTypeImports: false,
    pathGroupOverrides: [],
    fix: false,
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
      (!('pattern' in obj) || obj.pattern == null) &&
      obj.ignorePackages == null &&
      obj.checkTypeImports == null
    ) {
      Object.assign(result.pattern, obj)
      continue
    }

    // If pattern is provided, transfer all props
    if ('pattern' in obj && obj.pattern != null) {
      Object.assign(result.pattern, obj.pattern)
    }

    // If ignorePackages is provided, transfer it to result
    if (typeof obj.ignorePackages === 'boolean') {
      result.ignorePackages = obj.ignorePackages
    }

    if (typeof obj.checkTypeImports === 'boolean') {
      result.checkTypeImports = obj.checkTypeImports
    }

    if (obj.fix != null) {
      result.fix = Boolean(obj.fix)
    }

    if (Array.isArray(obj.pathGroupOverrides)) {
      result.pathGroupOverrides = obj.pathGroupOverrides
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
  return slashCount === 0 || (isScoped(file) && slashCount <= 1)
}

function computeOverrideAction(
  pathGroupOverrides: PathGroupOverride[],
  path: string,
) {
  for (const { pattern, patternOptions, action } of pathGroupOverrides) {
    if (minimatch(path, pattern, patternOptions || { nocomment: true })) {
      return action
    }
  }
}

export default createRule<Options, MessageId>({
  name: 'extensions',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Style guide',
      description:
        'Ensure consistent use of file extension within the import path.',
    },
    fixable: 'code',
    hasSuggestions: true,
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
      addMissing:
        'Add "{{extension}}" file extension from "{{importPath}}" into "{{fixedImportPath}}"',
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

        // If not undefined, the user decided if rules are enforced on this import
        const overrideAction = computeOverrideAction(
          props.pathGroupOverrides || [],
          importPathWithQueryString,
        )

        if (overrideAction === 'ignore') {
          return
        }

        // don't enforce anything on builtins
        if (
          !overrideAction &&
          isBuiltIn(importPathWithQueryString, context.settings)
        ) {
          return
        }

        const importPath = importPathWithQueryString.replace(/\?(.*)$/, '')

        // don't enforce in root external packages as they may have names with `.js`.
        // Like `import Decimal from decimal.js`)
        if (!overrideAction && isExternalRootModule(importPath)) {
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
            !overrideAction && isPackage,
          )
          const extensionForbidden = isUseOfExtensionForbidden(extension)
          if (extensionRequired && !extensionForbidden) {
            const { pathname, query, hash } = parsePath(
              importPathWithQueryString,
            )
            const fixedImportPath = stringifyPath({
              pathname: `${
                /([\\/]|[\\/]?\.?\.)$/.test(pathname)
                  ? `${
                      pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
                    }/index.${extension}`
                  : `${pathname}.${extension}`
              }`,
              query,
              hash,
            })
            const fixOrSuggest = {
              fix(fixer: RuleFixer) {
                return fixer.replaceText(
                  source,
                  JSON.stringify(fixedImportPath),
                )
              },
            }
            context.report({
              node: source,
              messageId: extension ? 'missingKnown' : 'missing',
              data: {
                extension,
                importPath: importPathWithQueryString,
              },
              ...(extension &&
                (props.fix
                  ? fixOrSuggest
                  : {
                      suggest: [
                        {
                          ...fixOrSuggest,
                          messageId: 'addMissing',
                          data: {
                            extension,
                            importPath: importPathWithQueryString,
                            fixedImportPath: fixedImportPath,
                          },
                        },
                      ],
                    })),
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
            ...(props.fix && {
              fix(fixer) {
                return fixer.replaceText(
                  source,
                  JSON.stringify(importPath.slice(0, -(extension.length + 1))),
                )
              },
            }),
          })
        }
      },
      { commonjs: true },
    )
  },
})
