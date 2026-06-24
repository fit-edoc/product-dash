const cacheService = require('../../services/cacheService');
const { redisClient } = require('../../config/redis');
const logger = require('../../utils/logger');

/**
 * Route-level middleware to cache JSON responses
 * @param {number} ttl - Time to live in seconds
 */
const routeCache = (ttl = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Bypass cache if request contains cache-control: no-cache
    if (req.headers['cache-control'] === 'no-cache') {
      logger.debug('Bypassing cache due to Cache-Control header');
      return next();
    }

    if (!redisClient.isOpen || !redisClient.isReady) {
      logger.debug('Redis client not ready, bypassing route cache');
      return next();
    }

    try {
      // 1. Generate versioned cache key
      const catalogVersion = await cacheService.getCatalogVersion();
      const cacheKey = `route:cache:v:${catalogVersion}:${req.originalUrl}`;

      // 2. Try to get cached response
      const cachedResponse = await redisClient.get(cacheKey);
      if (cachedResponse) {
        logger.debug(`Route Cache Hit: ${cacheKey}`);
        await cacheService.trackMetric(true);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        return res.send(cachedResponse);
      }

      logger.debug(`Route Cache Miss: ${cacheKey}`);
      await cacheService.trackMetric(false);
      res.setHeader('X-Cache', 'MISS');

      // 3. Intercept res.json to capture response payload
      const originalJson = res.json;
      res.json = function (body) {
        // Only cache successful status codes
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setEx(cacheKey, ttl, JSON.stringify(body))
            .then(() => logger.debug(`Cached route response: ${cacheKey}`))
            .catch((err) => logger.error(`Failed to cache route response: ${err.message}`));
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (err) {
      logger.error('Route Cache Middleware Error: %s', err.message);
      next();
    }
  };
};

module.exports = routeCache;
