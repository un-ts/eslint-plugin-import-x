import debug from 'debug'

import type { ImportSettings, PluginSettings } from '../types'

const log = debug('eslint-plugin-import-x:utils:ModuleCache')

export type CacheKey = unknown

export type CacheObject = {
  result: unknown
  lastSeen: ReturnType<typeof process.hrtime>
}

export class ModuleCache {
  constructor(public map: Map<CacheKey, CacheObject> = new Map()) {}

  set(cacheKey: CacheKey, result: unknown) {
    this.map.set(cacheKey, {
      result,
      lastSeen: process.hrtime(),
    })
    log('setting entry for', cacheKey)
    return result
  }

  get<T>(cacheKey: CacheKey, settings: ImportSettings['cache']): T | undefined {
    if (this.map.has(cacheKey)) {
      const f = this.map.get(cacheKey)
      // check freshness
      // @ts-expect-error TS can't narrow properly from `has` and `get`
      if (process.hrtime(f.lastSeen)[0] < settings.lifetime) {
        return f!.result as T
      }
    } else {
      log('cache miss for', cacheKey)
    }
    // cache miss
  }

  static getSettings(settings: PluginSettings) {
    const cacheSettings = {
      lifetime: 30, // seconds
      ...settings['import-x/cache'],
    }

    // parse infinity
    if (
      (['∞', 'Infinity'] as const).includes(
        // @ts-expect-error - TS can't narrow properly from `includes`
        cacheSettings.lifetime,
      )
    ) {
      cacheSettings.lifetime = Infinity
    }

    return cacheSettings as ImportSettings['cache'] & {
      lifetime: number
    }
  }
}
