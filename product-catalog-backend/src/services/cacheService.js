const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.DEFAULT_TTL = 3600; // 1 hour in seconds
    this.VERSION_KEY = 'product:catalog:version';
    this.HIT_METRIC_KEY = 'metrics:cache:hits';
    this.MISS_METRIC_KEY = 'metrics:cache:misses';
  }

  /**
   * Helper to verify if Redis is open and ready
   */
  _isAvailable() {
    return redisClient.isOpen && redisClient.isReady;
  }

  /**
   * Get the current catalog version. If not exists, initialize it.
   */
  async getCatalogVersion() {
    if (!this._isAvailable()) return '1';
    try {
      let version = await redisClient.get(this.VERSION_KEY);
      if (!version) {
        version = '1';
        await redisClient.set(this.VERSION_KEY, version);
      }
      return version;
    } catch (err) {
      logger.error('Redis getCatalogVersion error: %s', err.message);
      return '1'; // fallback
    }
  }

  /**
   * Increment the catalog version to instantly invalidate all cached catalog query pages
   */
  async incrementCatalogVersion() {
    if (!this._isAvailable()) return;
    try {
      const newVersion = await redisClient.incr(this.VERSION_KEY);
      logger.info(`Product catalog version bumped to v${newVersion} (All catalog query caches invalidated)`);
      return newVersion;
    } catch (err) {
      logger.error('Redis incrementCatalogVersion error: %s', err.message);
    }
  }

  /**
   * Generate cache key for a catalog list query
   */
  async generateCatalogKey(limit, cursorStr, filter = {}) {
    const version = await this.getCatalogVersion();
    const filterStr = JSON.stringify(filter);
    return `product:catalog:v:${version}:limit:${limit}:cursor:${cursorStr || 'none'}:filter:${filterStr}`;
  }

  /**
   * Fetch catalog from cache
   */
  async getCatalog(limit, cursorStr, filter = {}) {
    if (!this._isAvailable()) return null;
    try {
      const key = await this.generateCatalogKey(limit, cursorStr, filter);
      const cached = await redisClient.get(key);
      if (cached) {
        await this.trackMetric(true);
        logger.debug(`Cache Hit for catalog key: ${key}`);
        return JSON.parse(cached);
      }
      await this.trackMetric(false);
      logger.debug(`Cache Miss for catalog key: ${key}`);
      return null;
    } catch (err) {
      logger.error('Redis getCatalog error: %s', err.message);
      return null;
    }
  }

  /**
   * Save catalog to cache
   */
  async setCatalog(limit, cursorStr, filter = {}, data, ttl = this.DEFAULT_TTL) {
    if (!this._isAvailable()) return;
    try {
      const key = await this.generateCatalogKey(limit, cursorStr, filter);
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      logger.debug(`Cached catalog key: ${key} for ${ttl}s`);
    } catch (err) {
      logger.error('Redis setCatalog error: %s', err.message);
    }
  }

  /**
   * Fetch a single product by ID from cache
   */
  async getProduct(id) {
    if (!this._isAvailable()) return null;
    try {
      const key = `product:detail:${id}`;
      const cached = await redisClient.get(key);
      if (cached) {
        await this.trackMetric(true);
        logger.debug(`Cache Hit for product detail: ${key}`);
        return JSON.parse(cached);
      }
      await this.trackMetric(false);
      logger.debug(`Cache Miss for product detail: ${key}`);
      return null;
    } catch (err) {
      logger.error('Redis getProduct error: %s', err.message);
      return null;
    }
  }

  /**
   * Save a single product to cache
   */
  async setProduct(id, data, ttl = this.DEFAULT_TTL) {
    if (!this._isAvailable()) return;
    try {
      const key = `product:detail:${id}`;
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      logger.debug(`Cached product detail: ${key} for ${ttl}s`);
    } catch (err) {
      logger.error('Redis setProduct error: %s', err.message);
    }
  }

  /**
   * Invalidate cache for a specific product and increment catalog version
   */
  async invalidateProduct(id) {
    if (!this._isAvailable()) return;
    try {
      const detailKey = `product:detail:${id}`;
      await redisClient.del(detailKey);
      await this.incrementCatalogVersion();
      logger.info(`Invalidated cache for product: ${id}`);
    } catch (err) {
      logger.error('Redis invalidateProduct error: %s', err.message);
    }
  }

  /**
   * Track hits and misses metrics in Redis
   */
  async trackMetric(isHit) {
    if (!this._isAvailable()) return;
    try {
      const key = isHit ? this.HIT_METRIC_KEY : this.MISS_METRIC_KEY;
      await redisClient.incr(key);
    } catch (err) {
      logger.error('Redis trackMetric error: %s', err.message);
    }
  }

  /**
   * Retrieve hit rate performance metrics
   */
  async getCacheMetrics() {
    if (!this._isAvailable()) {
      return { status: 'Redis disconnected', hitRate: 0, hits: 0, misses: 0 };
    }
    try {
      const hits = parseInt(await redisClient.get(this.HIT_METRIC_KEY) || '0', 10);
      const misses = parseInt(await redisClient.get(this.MISS_METRIC_KEY) || '0', 10);
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;
      return {
        status: 'Redis connected',
        hits,
        misses,
        hitRate: `${hitRate.toFixed(2)}%`
      };
    } catch (err) {
      logger.error('Redis getCacheMetrics error: %s', err.message);
      return { status: 'Error reading metrics', hitRate: 0, hits: 0, misses: 0 };
    }
  }

  /**
   * Warm up the cache for basic queries after bulk operations
   * @param {Object} productService - Reference to product service to fetch data
   */
  async warmCache(productService) {
    if (!this._isAvailable()) {
      logger.warn('Cache warming skipped: Redis is not connected');
      return;
    }
    logger.info('Starting cache warming for popular query configurations...');
    try {
      // Warm up first page of products (default limit 10, no cursor)
      const page1 = await productService.getProducts({ limit: 10 });
      
      // Warm up first page of category-specific catalogs (if categories exist)
      // We will fetch categories from database and warm top 2 category lists
      const categories = ['Electronics', 'Clothing', 'Books'];
      for (const category of categories) {
        await productService.getProducts({ limit: 10, filter: { category } });
      }
      
      logger.info('Cache warming completed successfully.');
    } catch (err) {
      logger.error('Error during cache warming: %s', err.message);
    }
  }
}

module.exports = new CacheService();
