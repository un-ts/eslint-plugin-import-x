import debug from 'debug'

import { clearNodeResolverCache } from '../node-resolver.js'
import type { NormalizedCacheSettings, PluginSettings } from '../types.js'

const log = debug('eslint-plugin-import-x:utils:ModuleCache')

export interface CacheObject {
  result: unknown
  lastSeen: ReturnType<typeof process.hrtime>
}

export class ModuleCache {
  constructor(public map: Map<string, CacheObject> = new Map()) {}

  set(cacheKey: string, result: unknown) {
    this.map.set(cacheKey, {
      result,
      lastSeen: process.hrtime(),
    })
    log('setting entry for', cacheKey)
    return result
  }

  get<T>(cacheKey: string, settings: NormalizedCacheSettings): T | undefined {
    const cache = this.map.get(cacheKey)
    if (cache) {
      // check freshness
      if (process.hrtime(cache.lastSeen)[0] < settings.lifetime) {
        return cache.result as T
      }
    } else {
      log('cache miss for', cacheKey)
    }
    // cache miss
    clearNodeResolverCache()
  }

  static getSettings(settings: PluginSettings) {
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

    return cacheSettings as NormalizedCacheSettings
  }
}
