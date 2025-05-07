import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import path from 'node:path'

import {
  count_module_graph_size,
  is_barrel_file,
} from 'eslint-barrel-file-utils/index.cjs'
import { ResolverFactory } from 'unrs-resolver'
import type { ResolveResult } from 'unrs-resolver'

import { createRule } from '../utils/index.js'

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

// custom error class to emulate oxc_resolver ResolveError enum.
// `errorVariant` can be equal to a `ResolveError` enum variant.
class ResolveError extends Error {
  public errorVariant: string | null

  constructor(errorVariant: string | null = null, message: string = '') {
    super(message)
    this.errorVariant = errorVariant
    this.message = message
  }
}

export default createRule<[Options?], MessageId>({
  name: 'avoid-importing-barrel-files',
  meta: {
    type: 'problem',
    docs: {
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
            default: [],
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          maxModuleGraphSizeAllowed: {
            type: 'number',
            description: 'Maximum allowed module graph size',
            default: 20,
          },
          amountOfExportsToConsiderModuleAsBarrel: {
            type: 'number',
            description:
              'Amount of exports to consider a module as barrel file',
            default: 3,
          },
          exportConditions: {
            type: 'array',
            description:
              'Export conditions to use to resolve bare module specifiers',
            default: [],
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          mainFields: {
            type: 'array',
            description: 'Main fields to use to resolve modules',
            default: [],
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
          extensions: {
            type: 'array',
            description: 'Extensions to use to resolve modules',
            default: [],
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
  defaultOptions: [defaultOptions],
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

    const resolver = new ResolverFactory({
      tsconfig,
      alias,
      conditionNames: exportConditions,
      mainFields,
      extensions,
    })

    return {
      ImportDeclaration(node) {
        const moduleSpecifier = node.source.value
        const currentFileName = context.filename

        if (options?.allowList?.includes(moduleSpecifier)) {
          return
        }

        if (node?.importKind === 'type') {
          return
        }

        if (builtinModules.includes(moduleSpecifier.replace('node:', ''))) {
          return
        }

        let resolvedPath: ResolveResult
        try {
          resolvedPath = resolver.sync(
            path.dirname(currentFileName),
            moduleSpecifier,
          )

          if (resolvedPath.error) {
            // assuming ResolveError::NotFound if ResolveResult's path value is None
            if (!resolvedPath.path) {
              throw new ResolveError('NotFound', resolvedPath.error)
            }

            throw new ResolveError(null, resolvedPath.error)
          }
        } catch {
          // do nothing since we couldn't resolve it
          return
        }

        if (!resolvedPath.path) {
          throw new ResolveError('NotFound', resolvedPath.error)
        }

        const fileContent = readFileSync(resolvedPath.path, 'utf8')
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
              ? count_module_graph_size(resolvedPath.path, resolutionOptions)
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
            ? count_module_graph_size(resolvedPath.path, resolutionOptions)
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
