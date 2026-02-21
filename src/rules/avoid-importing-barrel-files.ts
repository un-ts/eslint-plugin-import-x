import { readFileSync } from 'node:fs'

import {
  count_module_graph_size,
  is_barrel_file,
} from 'eslint-barrel-file-utils/index.cjs'

import { createRule, resolve } from '../utils/index.js'

export interface Options {
  allowList: string[]
  maxModuleGraphSizeAllowed: number
  amountOfExportsToConsiderModuleAsBarrel: number
  exportConditions: string[]
  mainFields: string[]
  extensions: string[]
  tsconfig?: {
    configFile: string
    references: string[]
  }
  alias?: Record<string, Array<string | null | undefined>>
}

export type MessageId = 'avoidImport'

const defaultOptions: Options = {
  allowList: [],
  maxModuleGraphSizeAllowed: 20,
  amountOfExportsToConsiderModuleAsBarrel: 3,
  exportConditions: ['node', 'import'],
  mainFields: ['module', 'browser', 'main'],
  extensions: ['.js', '.ts', '.tsx', '.jsx', '.json', '.node'],
  tsconfig: undefined,
  alias: undefined,
}

const cache: Record<
  string,
  { isBarrelFile: boolean; moduleGraphSize: number }
> = {}

/**
 * @param {string} specifier
 * @returns {boolean}
 */
const isBareModuleSpecifier = (specifier: string): boolean => {
  if (specifier && specifier.length > 0) {
    return /[@a-zA-Z]/.test(specifier.replaceAll("'", '')[0])
  }
  return false
}

export default createRule<[Options?], MessageId>({
  name: 'avoid-importing-barrel-files',
  meta: {
    type: 'problem',
    docs: {
      category: 'Performance',
      description: 'Forbid importing barrel files.',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowList: {
            type: 'array',
            description: 'List of modules from which to allow barrel files',
            default: defaultOptions.allowList,
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          maxModuleGraphSizeAllowed: {
            type: 'number',
            description: 'Maximum allowed module graph size',
            default: defaultOptions.maxModuleGraphSizeAllowed,
          },
          amountOfExportsToConsiderModuleAsBarrel: {
            type: 'number',
            description:
              'Amount of exports to consider a module as barrel file',
            default: defaultOptions.amountOfExportsToConsiderModuleAsBarrel,
          },
          exportConditions: {
            type: 'array',
            description:
              'Export conditions to use to resolve bare module specifiers',
            default: defaultOptions.exportConditions,
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          mainFields: {
            type: 'array',
            description: 'Main fields to use to resolve modules',
            default: defaultOptions.mainFields,
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          extensions: {
            type: 'array',
            description: 'Extensions to use to resolve modules',
            default: defaultOptions.extensions,
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          // schema to match oxc-resolver's TsconfigOptions
          tsconfig: {
            type: 'object',
            description: 'Options to TsconfigOptions',
            properties: {
              configFile: {
                type: 'string',
                description: 'Relative path to the configuration file',
              },
              references: {
                type: 'array',
                description: 'Typescript Project References',
                items: {
                  type: 'string',
                },
              },
            },
          },
          // NapiResolveOptions.alias
          alias: {
            type: 'object',
            description: 'Webpack aliases used in imports or requires',
          },
        },
      },
    ],
    messages: {
      avoidImport:
        'The imported module "{{specifier}}" is a barrel file, which leads to importing a module graph of {{amount}} modules, which exceeds the maximum allowed size of {{maxModuleGraphSizeAllowed}} modules',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || defaultOptions
    const maxModuleGraphSizeAllowed = options.maxModuleGraphSizeAllowed
    const amountOfExportsToConsiderModuleAsBarrel =
      options.amountOfExportsToConsiderModuleAsBarrel
    const exportConditions = options.exportConditions
    const mainFields = options.mainFields
    const extensions = options.extensions
    const tsconfig = options.tsconfig
    const alias = options.alias

    const resolutionOptions = {
      exportConditions,
      mainFields,
      extensions,
      tsconfig,
      alias,
    }

    const allowList = new Set(options?.allowList)

    return {
      ImportDeclaration(node) {
        if (node?.importKind === 'type') {
          return
        }

        const moduleSpecifier = node.source.value

        if (allowList.has(moduleSpecifier)) {
          return
        }

        const resolvedPath = resolve(moduleSpecifier, context)

        if (!resolvedPath) {
          // do nothing since we couldn't resolve it
          return
        }

        let fileContent: string
        try {
          fileContent = readFileSync(resolvedPath, 'utf8')
        } catch {
          // do nothing since we couldn't read the file
          return
        }
        let isBarrelFile: boolean

        /** Only cache bare module specifiers, as local files can change */
        if (isBareModuleSpecifier(moduleSpecifier)) {
          /**
           * The module specifier is not cached yet, so we need to analyze and
           * cache it
           */
          if (cache[moduleSpecifier] === undefined) {
            isBarrelFile = is_barrel_file(
              fileContent,
              amountOfExportsToConsiderModuleAsBarrel,
            )
            const moduleGraphSize = isBarrelFile
              ? count_module_graph_size(resolvedPath, resolutionOptions)
              : -1

            cache[moduleSpecifier] = {
              isBarrelFile,
              moduleGraphSize,
            }

            if (moduleGraphSize > maxModuleGraphSizeAllowed) {
              context.report({
                node: node.source,
                messageId: 'avoidImport',
                data: {
                  amount: moduleGraphSize,
                  specifier: moduleSpecifier,
                  maxModuleGraphSizeAllowed,
                },
              })
            }
          } else {
            /**
             * It is a bare module specifier, but cached, so we can use the
             * cached value
             */

            if (
              cache[moduleSpecifier].moduleGraphSize > maxModuleGraphSizeAllowed
            ) {
              context.report({
                node: node.source,
                messageId: 'avoidImport',
                data: {
                  amount: cache[moduleSpecifier].moduleGraphSize,
                  specifier: moduleSpecifier,
                  maxModuleGraphSizeAllowed,
                },
              })
            }
          }
        } else {
          /**
           * Its not a bare module specifier, but local module, so we need to
           * analyze it
           */
          const isBarrelFile = is_barrel_file(
            fileContent,
            amountOfExportsToConsiderModuleAsBarrel,
          )
          const moduleGraphSize = isBarrelFile
            ? count_module_graph_size(resolvedPath, resolutionOptions)
            : -1
          if (moduleGraphSize > maxModuleGraphSizeAllowed) {
            context.report({
              node: node.source,
              messageId: 'avoidImport',
              data: {
                amount: moduleGraphSize,
                specifier: moduleSpecifier,
                maxModuleGraphSizeAllowed,
              },
            })
          }
        }
      },
    }
  },
})
