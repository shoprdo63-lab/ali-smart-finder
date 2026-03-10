import NodeCache from 'node-cache';

/**
 * Intelligent caching layer with TTL and statistics
 */
class CacheService {
  constructor(ttl = 600) {
    this.cache = new NodeCache({
      stdTTL: ttl,
      checkperiod: 60,
      useClones: false
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      console.log(`✓ Cache HIT: ${key}`);
      return value;
    }
    this.stats.misses++;
    console.log(`✗ Cache MISS: ${key}`);
    return null;
  }

  set(key, value, ttl) {
    this.stats.sets++;
    this.cache.set(key, value, ttl);
    console.log(`✓ Cache SET: ${key}`);
  }

  has(key) {
    return this.cache.has(key);
  }

  del(key) {
    this.cache.del(key);
  }

  flush() {
    this.cache.flushAll();
    console.log('✓ Cache flushed');
  }

  getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...this.stats,
      keys: cacheStats.keys,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
        : 0
    };
  }
}

export default CacheService;
