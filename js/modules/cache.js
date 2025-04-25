// Глобальный кэш-менеджер
const globalCache = new Map();
const CACHE_LIFETIME = 30000; // 30 секунд

export class CacheManager {
  static get(key) {
    const cached = globalCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_LIFETIME) {
      return cached.data;
    }
    return null;
  }

  static set(key, data) {
    globalCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  static delete(key) {
    globalCache.delete(key);
  }

  static clear() {
    globalCache.clear();
  }

  static has(key) {
    return globalCache.has(key);
  }
}
