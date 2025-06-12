import Module, { createRequire } from 'node:module'
import path from 'node:path'

import { cjsRequire } from '../require.js'
import type { ChildContext, RuleContext } from '../types.js'

function createModule(filename: string) {
  const mod = new Module(filename)
  mod.filename = filename
  // @ts-expect-error _nodeModulesPaths are undocumented
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  return mod
}

export function moduleRequire<T>(
  p: string,
  context: ChildContext | RuleContext,
): T {
  try {
    // attempt to get espree relative to eslint
    const eslintPath = cjsRequire.resolve('eslint')
    const eslintModule = createModule(eslintPath)

    return cjsRequire(
      // @ts-expect-error _resolveFilename is undocumented
      Module._resolveFilename(p, eslintModule),
    )
  } catch {
    //
  }

  try {
    // try relative to entry point
    return cjsRequire.main!.require(p)
  } catch {
    //
  }

  try {
    // try relative to the current context
    return createRequire(context.physicalFilename)(p)
  } catch {
    //
  }

  // finally, try from here
  return cjsRequire(p)
}
