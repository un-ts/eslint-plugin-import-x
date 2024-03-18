import Module from 'node:module'
import path from 'node:path'

// borrowed from @babel/eslint-parser
function createModule(filename: string) {
  const mod = new Module(filename)
  mod.filename = filename
  // @ts-expect-error _nodeModulesPaths are undocumented
  mod.paths = Module._nodeModulePaths(path.dirname(filename))
  return mod
}

export function moduleRequire<T>(p: string): T {
  try {
    // attempt to get espree relative to eslint
    const eslintPath = require.resolve('eslint')
    const eslintModule = createModule(eslintPath)
    // @ts-expect-error _resolveFilename is undocumented
    return require(Module._resolveFilename(p, eslintModule))
  } catch {
    //
  }

  try {
    // try relative to entry point
    return require.main!.require(p)
  } catch {
    //
  }

  // finally, try from here
  return require(p)
}
