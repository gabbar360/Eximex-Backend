// Simple in-memory cache implementation
// For production, consider using Redis or Memcached

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Set a value in cache with TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiry,
    });
  }

  /**
   * Get a value from cache
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete a key from cache
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Check if key exists
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clean expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Cleanup expired entries every minute
setInterval(() => {
  cacheManager.cleanup();
}, 60 * 1000);

export { cacheManager };

// Cache decorator for functions
export const cacheable = (ttl = 5 * 60 * 1000) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const cacheKey = `${target.constructor.name}_${propertyKey}_${JSON.stringify(args)}`;

      // Try to get from cache first
      const cached = cacheManager.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      cacheManager.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
};

// Cache middleware for Express routes
export const cacheMiddleware = (ttl = 5 * 60 * 1000) => {
  return (req, res, next) => {
    const cacheKey = `route_${req.method}_${req.originalUrl}_${JSON.stringify(req.query)}`;

    const cached = cacheManager.get(cacheKey);
    if (cached !== null) {
      return res.json(cached);
    }

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache response
    res.json = function (data) {
      cacheManager.set(cacheKey, data, ttl);
      return originalSend.call(this, data);
    };

    next();
  };
};
