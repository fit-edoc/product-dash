const logger = require('../../utils/logger');

/**
 * Express middleware to log requests and monitor execution duration
 */
const loggingMiddleware = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // Intercept the response finish event to log complete request cycle
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const message = `${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    // Log with appropriate level depending on HTTP response status code
    if (statusCode >= 500) {
      logger.error(message, { method, url: originalUrl, statusCode, duration, ip });
    } else if (statusCode >= 400) {
      logger.warn(message, { method, url: originalUrl, statusCode, duration, ip });
    } else {
      logger.info(message, { method, url: originalUrl, statusCode, duration, ip });
    }
  });

  next();
};

module.exports = loggingMiddleware;
