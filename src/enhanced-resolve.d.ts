export type AliasOptionNewRequest = string | false | string[]

export type AliasOptions = {
  [index: string]: AliasOptionNewRequest
}

export type ExtensionAliasOptions = {
  [index: string]: string | string[]
}

export type ResolveOptions = {
  /**
   * A list of module alias configurations or an object which maps key to value
   */
  alias?: AliasOptions | AliasOption[]

  /**
   * A list of module alias configurations or an object which maps key to value, applied only after modules option
   */
  fallback?: AliasOptions | AliasOption[]

  /**
   * An object which maps extension to extension aliases
   */
  extensionAlias?: ExtensionAliasOptions

  /**
   * A list of alias fields in description files
   */
  aliasFields?: Array<string | string[]>

  /**
   * Whether or not the unsafeCache should include request context as part of the cache key.
   */
  cacheWithContext?: boolean

  /**
   * A list of description files to read from
   */
  descriptionFiles?: string[]

  /**
   * A list of exports field condition names.
   */
  conditionNames?: string[]

  /**
   * Enforce that a extension from extensions must be used
   */
  enforceExtension?: boolean

  /**
   * A list of exports fields in description files
   */
  exportsFields?: Array<string | string[]>

  /**
   * A list of imports fields in description files
   */
  importsFields?: Array<string | string[]>

  /**
   * A list of extensions which should be tried for files
   */
  extensions?: string[]

  /**
   * Use this cache object to unsafely cache the successful requests
   */
  unsafeCache?: boolean | object

  /**
   * Resolve symlinks to their symlinked location
   */
  symlinks?: boolean

  /**
   * A list of directories to resolve modules from, can be absolute path or folder name
   */
  modules?: string | string[]

  /**
   * A list of main fields in description files
   */
  mainFields?: Array<
    string | string[] | { name: string | string[]; forceRelative: boolean }
  >

  /**
   * A list of main files in directories
   */
  mainFiles?: string[]

  /**
   * A PnP API that should be used - null is "never", undefined is "auto"
   */
  pnpApi?: null | PnpApi

  /**
   * A list of root paths
   */
  roots?: string[]

  /**
   * The request is already fully specified and no extensions or directories are resolved for it
   */
  fullySpecified?: boolean

  /**
   * Resolve to a context instead of a file
   */
  resolveToContext?: boolean

  /**
   * A list of resolve restrictions
   */
  restrictions?: Array<string | RegExp>

  /**
   * Use only the sync constraints of the file system calls
   */
  useSyncFileSystemCalls?: boolean

  /**
   * Prefer to resolve module requests as relative requests before falling back to modules
   */
  preferRelative?: boolean

  /**
   * Prefer to resolve server-relative urls as absolute paths before falling back to resolve in roots
   */
  preferAbsolute?: boolean
}
