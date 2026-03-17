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
  /** Array form per npm spec; object form is non-standard but intentionally supported by this rule */
  bundleDependencies?: string[] | Record<string, string>
  bundledDependencies?: string[] | Record<string, string>
}
