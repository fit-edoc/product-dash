const { createClient } = require('redis');
const logger = require('../utils/logger');

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const socketOptions = {
  reconnectStrategy: (retries) => {
    // Reconnect strategy: try every 2 seconds, max 10 times, then wait 5 seconds
    if (retries > 10) {
      logger.error('Redis reconnect attempts exhausted. Waiting 5 seconds before retrying.');
      return 5000;
    }
    return 2000;
  }
};

if (redisUrl.startsWith('rediss://')) {
  socketOptions.tls = true;
  socketOptions.rejectUnauthorized = false;
}

const redisClient = createClient({
  url: redisUrl,
  socket: socketOptions
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error: %s', err.message);
});

redisClient.on('connect', () => {
  logger.info('Connecting to Redis...');
});

redisClient.on('ready', () => {
  logger.info('Redis client connected and ready');
});

redisClient.on('end', () => {
  logger.warn('Redis client connection closed');
});

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error('Could not connect to Redis: %s', error.message);
  }
};

module.exports = {
  redisClient,
  connectRedis
};
