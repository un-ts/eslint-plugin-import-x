import { builtinModules } from 'module'

export const isCoreModule = pkg =>
  builtinModules.includes(pkg.startsWith('node:') ? pkg.slice(5) : pkg)
