import path from 'node:path'

import type { ModuleOptions } from '../utils/index.js'
import {
  importType,
  createRule,
  moduleVisitor,
  makeOptionsSchema,
  readPkgUp,
  resolve,
} from '../utils/index.js'

type MessageId = 'noAllowed'

export interface Options extends ModuleOptions {
  ignorePrivateImports?: boolean
}

export default createRule<[Options?], MessageId>({
  name: 'no-relative-parent-imports',
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Static analysis',
      description: 'Forbid importing modules from parent directories.',
    },
    schema: [
      makeOptionsSchema({
        ignorePrivateImports: { type: 'boolean' },
      }),
    ],
    messages: {
      noAllowed:
        "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `{{filename}}` to same directory as `{{depPath}}` or consider making `{{depPath}}` a package.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.physicalFilename

    if (filename === '<text>') {
      return {}
    } // can't check a non-file

    const ignorePrivateImports = context.options[0]?.ignorePrivateImports

    let privateImportKeys: string[] | undefined

    function isPrivateImport(specifier: string) {
      if (!specifier.startsWith('#')) {
        return false
      }
      privateImportKeys ??= Object.keys(
        readPkgUp({ cwd: filename }).pkg?.imports ?? {},
      )
      return privateImportKeys.some(key => matchesImportsKey(specifier, key))
    }

    return moduleVisitor(sourceNode => {
      const depPath = sourceNode.value

      if (ignorePrivateImports && isPrivateImport(depPath)) {
        return
      }

      if (importType(depPath, context) === 'external') {
        // ignore packages
        return
      }

      const absDepPath = resolve(depPath, context)

      if (!absDepPath) {
        // unable to resolve path
        return
      }

      const relDepPath = path.relative(path.dirname(filename), absDepPath)

      if (importType(relDepPath, context) === 'parent') {
        context.report({
          node: sourceNode,
          messageId: 'noAllowed',
          data: {
            filename: path.basename(filename),
            depPath,
          },
        })
      }
    }, context.options[0])
  },
})

// Same matching as Node's `imports` lookup: an exact key, or a key with a
// single `*` wildcard
function matchesImportsKey(specifier: string, key: string) {
  const star = key.indexOf('*')
  if (star === -1) {
    return specifier === key
  }
  const base = key.slice(0, star)
  const trailer = key.slice(star + 1)
  return (
    specifier.startsWith(base) &&
    specifier !== base &&
    (trailer === '' ||
      (specifier.endsWith(trailer) && specifier.length >= key.length))
  )
}
