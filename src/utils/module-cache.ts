import debug from 'debug'

import type { NormalizedCacheSettings, PluginSettings } from '../types.js'

const log = debug('eslint-plugin-import-x:utils:ModuleCache')

export interface CacheObject {
  result: unknown
  /** `performance.now()` timestamp of the last write. */
  lastSeen: number
}

const settingsCache = new WeakMap<
  NonNullable<PluginSettings['import-x/cache']> | PluginSettings,
  NormalizedCacheSettings
>()

export class ModuleCache {
  constructor(public map: Map<string, CacheObject> = new Map()) {}

  set(cacheKey: string, result: unknown) {
    this.map.set(cacheKey, {
      result,
      lastSeen: performance.now(),
    })
    log('setting entry for', cacheKey)
    return result
  }

  get<T>(cacheKey: string, settings: NormalizedCacheSettings): T | undefined {
    const cache = this.map.get(cacheKey)
    if (cache) {
      // check freshness
      if (performance.now() - cache.lastSeen < settings.lifetime * 1000) {
        return cache.result as T
      }
    } else {
      log('cache miss for', cacheKey)
    }
    // cache miss
  }

  /** Parsed (and memoized per settings object) `import-x/cache` settings. */
  static getSettings(settings: PluginSettings) {
    const memoKey = settings['import-x/cache'] ?? settings
    const cached = settingsCache.get(memoKey)
    if (cached) {
      return cached
    }

    const cacheSettings = {
      lifetime: 30, // seconds
      ...settings['import-x/cache'],
    }

    // parse infinity
    if (
      typeof cacheSettings.lifetime === 'string' &&
      (['∞', 'Infinity'] as const).includes(cacheSettings.lifetime)
    ) {
      cacheSettings.lifetime = Number.POSITIVE_INFINITY
    }

    settingsCache.set(memoKey, cacheSettings as NormalizedCacheSettings)
    return cacheSettings as NormalizedCacheSettings
  }
}
