'use strict'

const log = require('debug')('eslint-module-utils:ModuleCache')

class ModuleCache {
  constructor(map) {
    this.map = map || new Map()
  }

  /**
   * returns value for returning inline
   * @param {[type]} cacheKey [description]
   * @param {[type]} result   [description]
   */
  set(cacheKey, result) {
    this.map.set(cacheKey, { result, lastSeen: process.hrtime() })
    log('setting entry for', cacheKey)
    return result
  }

  get(cacheKey, settings) {
    if (this.map.has(cacheKey)) {
      const f = this.map.get(cacheKey)
      // check freshness
      if (process.hrtime(f.lastSeen)[0] < settings.lifetime) {
        return f.result
      }
    } else {
      log('cache miss for', cacheKey)
    }
    // cache miss
    return
  }
}

ModuleCache.getSettings = function (settings) {
  const cacheSettings = Object.assign(
    {
      lifetime: 30, // seconds
    },
    settings['i/cache'],
  )

  // parse infinity
  if (cacheSettings.lifetime === '∞' || cacheSettings.lifetime === 'Infinity') {
    cacheSettings.lifetime = Number.POSITIVE_INFINITY
  }

  return cacheSettings
}

module.exports = ModuleCache
