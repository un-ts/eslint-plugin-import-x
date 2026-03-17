/**
 * Minimal subset of package.json fields used by this plugin.
 * Defined inline to avoid a runtime dependency solely for type information.
 */
export interface PackageJson {
  name?: string
  version?: string
  private?: boolean
  main?: string
  bin?: string | Record<string, string>
  browser?: string | Record<string, string | false>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  /** Array of package names, or true to bundle all dependencies (per npm spec) */
  bundleDependencies?: string[] | boolean
  bundledDependencies?: string[] | boolean
}
