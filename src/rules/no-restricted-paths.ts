import path from 'node:path'

import type { TSESTree } from '@typescript-eslint/utils'
import isGlob from 'is-glob'
import { Minimatch } from 'minimatch'

import type { Arrayable } from '../types'
import { importType, createRule, moduleVisitor, resolve } from '../utils'

const containsPath = (filepath: string, target: string) => {
  const relative = path.relative(target, filepath)
  return relative === '' || !relative.startsWith('..')
}

function isMatchingTargetPath(filename: string, targetPath: string) {
  if (isGlob(targetPath)) {
    const mm = new Minimatch(targetPath, { windowsPathsNoEscape: true })
    return mm.match(filename)
  }

  return containsPath(filename, targetPath)
}

function areBothGlobPatternAndAbsolutePath(areGlobPatterns: boolean[]) {
  return (
    areGlobPatterns.some(Boolean) && areGlobPatterns.some(isGlob => !isGlob)
  )
}

type Options = {
  basePath?: string
  zones?: Array<{
    from: Arrayable<string>
    target: Arrayable<string>
    message?: string
    except?: string[]
  }>
}

type MessageId = 'path' | 'mixedGlob' | 'glob' | 'zone'

type Validator = {
  isPathRestricted: (absoluteImportPath: string) => boolean
  hasValidExceptions: boolean
  isPathException?: (absoluteImportPath: string) => boolean
  reportInvalidException: (node: TSESTree.Node) => void
}

export = createRule<[Options?], MessageId>({
  name: 'no-restricted-paths',
  meta: {
    type: 'problem',
    docs: {
      category: 'Static analysis',
      description: 'Enforce which files can be imported in a given folder.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          zones: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                target: {
                  anyOf: [
                    { type: 'string' },
                    {
                      type: 'array',
                      items: { type: 'string' },
                      uniqueItems: true,
                      minItems: 1,
                    },
                  ],
                },
                from: {
                  anyOf: [
                    { type: 'string' },
                    {
                      type: 'array',
                      items: { type: 'string' },
                      uniqueItems: true,
                      minItems: 1,
                    },
                  ],
                },
                except: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                  uniqueItems: true,
                },
                message: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
          basePath: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      path: 'Restricted path exceptions must be descendants of the configured `from` path for that zone.',
      mixedGlob:
        'Restricted path `from` must contain either only glob patterns or none',
      glob: 'Restricted path exceptions must be glob patterns when `from` contains glob patterns',
      zone: 'Unexpected path "{{importPath}}" imported in restricted zone.{{extra}}',
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}
    const restrictedPaths = options.zones || []
    const basePath = options.basePath || process.cwd()
    const filename = context.physicalFilename
    const matchingZones = restrictedPaths.filter(zone =>
      [zone.target]
        .flat()
        .map(target => path.resolve(basePath, target))
        .some(targetPath => isMatchingTargetPath(filename, targetPath)),
    )

    function isValidExceptionPath(
      absoluteFromPath: string,
      absoluteExceptionPath: string,
    ) {
      const relativeExceptionPath = path.relative(
        absoluteFromPath,
        absoluteExceptionPath,
      )

      return importType(relativeExceptionPath, context) !== 'parent'
    }

    function reportInvalidExceptionPath(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'path',
      })
    }

    function reportInvalidExceptionMixedGlobAndNonGlob(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'mixedGlob',
      })
    }

    function reportInvalidExceptionGlob(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'glob',
      })
    }

    function computeMixedGlobAndAbsolutePathValidator() {
      return {
        isPathRestricted: () => true,
        hasValidExceptions: false,
        reportInvalidException: reportInvalidExceptionMixedGlobAndNonGlob,
      }
    }

    function computeGlobPatternPathValidator(
      absoluteFrom: string,
      zoneExcept: string[],
    ) {
      let isPathException: ((absoluteImportPath: string) => boolean) | undefined

      const mm = new Minimatch(absoluteFrom, { windowsPathsNoEscape: true })
      const isPathRestricted = (absoluteImportPath: string) =>
        mm.match(absoluteImportPath)
      const hasValidExceptions = zoneExcept.every(it => isGlob(it))

      if (hasValidExceptions) {
        const exceptionsMm = zoneExcept.map(
          except => new Minimatch(except, { windowsPathsNoEscape: true }),
        )
        isPathException = (absoluteImportPath: string) =>
          exceptionsMm.some(mm => mm.match(absoluteImportPath))
      }

      const reportInvalidException = reportInvalidExceptionGlob

      return {
        isPathRestricted,
        hasValidExceptions,
        isPathException,
        reportInvalidException,
      }
    }

    function computeAbsolutePathValidator(
      absoluteFrom: string,
      zoneExcept: string[],
    ) {
      let isPathException: ((absoluteImportPath: string) => boolean) | undefined

      const isPathRestricted = (absoluteImportPath: string) =>
        containsPath(absoluteImportPath, absoluteFrom)

      const absoluteExceptionPaths = zoneExcept.map(exceptionPath =>
        path.resolve(absoluteFrom, exceptionPath),
      )
      const hasValidExceptions = absoluteExceptionPaths.every(
        absoluteExceptionPath =>
          isValidExceptionPath(absoluteFrom, absoluteExceptionPath),
      )

      if (hasValidExceptions) {
        isPathException = absoluteImportPath =>
          absoluteExceptionPaths.some(absoluteExceptionPath =>
            containsPath(absoluteImportPath, absoluteExceptionPath),
          )
      }

      const reportInvalidException = reportInvalidExceptionPath

      return {
        isPathRestricted,
        hasValidExceptions,
        isPathException,
        reportInvalidException,
      }
    }

    function reportInvalidExceptions(
      validators: Validator[],
      node: TSESTree.Node,
    ) {
      for (const validator of validators) validator.reportInvalidException(node)
    }

    function reportImportsInRestrictedZone(
      validators: Validator[],
      node: TSESTree.Node,
      importPath: string,
      customMessage?: string,
    ) {
      for (const _ of validators) {
        context.report({
          node,
          messageId: 'zone',
          data: {
            importPath,
            extra: customMessage ? ` ${customMessage}` : '',
          },
        })
      }
    }

    const makePathValidators = (
      zoneFrom: Arrayable<string>,
      zoneExcept: string[] = [],
    ) => {
      const allZoneFrom = [zoneFrom].flat()
      const areGlobPatterns = allZoneFrom.map(it => isGlob(it))

      if (areBothGlobPatternAndAbsolutePath(areGlobPatterns)) {
        return [computeMixedGlobAndAbsolutePathValidator()]
      }

      const isGlobPattern = areGlobPatterns.every(Boolean)

      return allZoneFrom.map(singleZoneFrom => {
        const absoluteFrom = path.resolve(basePath, singleZoneFrom)

        if (isGlobPattern) {
          return computeGlobPatternPathValidator(absoluteFrom, zoneExcept)
        }
        return computeAbsolutePathValidator(absoluteFrom, zoneExcept)
      })
    }

    const validators: Validator[][] = []

    return moduleVisitor(
      source => {
        const importPath = source.value

        const absoluteImportPath = resolve(importPath, context)

        if (!absoluteImportPath) {
          return
        }

        for (const [index, zone] of matchingZones.entries()) {
          if (!validators[index]) {
            validators[index] = makePathValidators(zone.from, zone.except)
          }

          const applicableValidatorsForImportPath = validators[index].filter(
            validator => validator.isPathRestricted(absoluteImportPath),
          )

          const validatorsWithInvalidExceptions =
            applicableValidatorsForImportPath.filter(
              validator => !validator.hasValidExceptions,
            )

          reportInvalidExceptions(validatorsWithInvalidExceptions, source)

          const applicableValidatorsForImportPathExcludingExceptions =
            applicableValidatorsForImportPath.filter(
              validator =>
                validator.hasValidExceptions &&
                !validator.isPathException!(absoluteImportPath),
            )
          reportImportsInRestrictedZone(
            applicableValidatorsForImportPathExcludingExceptions,
            source,
            importPath,
            zone.message,
          )
        }
      },
      { commonjs: true },
    )
  },
})
