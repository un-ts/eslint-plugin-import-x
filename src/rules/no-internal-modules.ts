import { makeRe } from 'minimatch'

import { importType, createRule, moduleVisitor, resolve } from '../utils'

// minimatch patterns are expected to use / path separators, like import
// statements, so normalize paths to use the same
function normalizeSep(somePath: string) {
  return somePath.split('\\').join('/')
}

function toSteps(somePath: string) {
  return normalizeSep(somePath)
    .split('/')
    .filter(step => step && step !== '.')
    .reduce<string[]>((acc, step) => {
      if (step === '..') {
        return acc.slice(0, -1)
      }
      return [...acc, step]
    }, [])
}

const potentialViolationTypes = new Set([
  'parent',
  'index',
  'sibling',
  'external',
  'internal',
])

type Options = {
  allow?: string[]
  forbid?: string[]
}

type MessageId = 'noAllowed'

export = createRule<[Options?], MessageId>({
  name: 'no-internal-modules',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description: 'Forbid importing the submodules of other modules.',
    },
    schema: [
      {
        anyOf: [
          {
            type: 'object',
            properties: {
              allow: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              forbid: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
            additionalProperties: false,
          },
        ],
      },
    ],
    messages: {
      noAllowed: `Reaching to "{{importPath}}" is not allowed.`,
    },
  },
  defaultOptions: [],
  create(context) {
    const options = context.options[0] || {}
    const allowRegexps = (options.allow || [])
      .map(p => makeRe(p))
      .filter(Boolean)
    const forbidRegexps = (options.forbid || [])
      .map(p => makeRe(p))
      .filter(Boolean)

    // test if reaching to this destination is allowed
    function reachingAllowed(importPath: string) {
      return allowRegexps.some(re => re.test(importPath))
    }

    // test if reaching to this destination is forbidden
    function reachingForbidden(importPath: string) {
      return forbidRegexps.some(re => re.test(importPath))
    }

    function isAllowViolation(importPath: string) {
      const steps = toSteps(importPath)

      const nonScopeSteps = steps.filter(step => step.indexOf('@') !== 0)
      if (nonScopeSteps.length <= 1) {
        return false
      }

      // before trying to resolve, see if the raw import (with relative
      // segments resolved) matches an allowed pattern
      const justSteps = steps.join('/')
      if (reachingAllowed(justSteps) || reachingAllowed(`/${justSteps}`)) {
        return false
      }

      // if the import statement doesn't match directly, try to match the
      // resolved path if the import is resolvable
      const resolved = resolve(importPath, context)
      if (!resolved || reachingAllowed(normalizeSep(resolved))) {
        return false
      }

      // this import was not allowed by the allowed paths, and reaches
      // so it is a violation
      return true
    }

    function isForbidViolation(importPath: string) {
      const steps = toSteps(importPath)

      // before trying to resolve, see if the raw import (with relative
      // segments resolved) matches a forbidden pattern
      const justSteps = steps.join('/')

      if (reachingForbidden(justSteps) || reachingForbidden(`/${justSteps}`)) {
        return true
      }

      // if the import statement doesn't match directly, try to match the
      // resolved path if the import is resolvable
      const resolved = resolve(importPath, context)
      if (resolved && reachingForbidden(normalizeSep(resolved))) {
        return true
      }

      // this import was not forbidden by the forbidden paths so it is not a violation
      return false
    }

    // find a directory that is being reached into, but which shouldn't be
    const isReachViolation = options.forbid
      ? isForbidViolation
      : isAllowViolation

    return moduleVisitor(
      source => {
        const importPath = source.value
        if (
          potentialViolationTypes.has(importType(importPath, context)) &&
          isReachViolation(importPath)
        ) {
          context.report({
            node: source,
            messageId: 'noAllowed',
            data: {
              importPath,
            },
          })
        }
      },
      { commonjs: true },
    )
  },
})
