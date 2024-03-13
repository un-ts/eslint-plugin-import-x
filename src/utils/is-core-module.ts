import Module from 'module'

export const isCoreModule = (pkg: string) =>
  Module.builtinModules.includes(pkg.startsWith('node:') ? pkg.slice(5) : pkg)
