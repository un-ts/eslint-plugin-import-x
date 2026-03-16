export interface PackageJson {
  name?: string
  version?: string
  private?: boolean
  main?: string
  browser?: string | Partial<Record<string, string | false>>
  bin?: string | Partial<Record<string, string>>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  bundleDependencies?: string[] | Record<string, unknown>
  bundledDependencies?: string[] | Record<string, unknown>
  [key: string]: unknown
}
