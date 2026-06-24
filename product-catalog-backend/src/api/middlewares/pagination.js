const { BadRequestError } = require('../../utils/errors');

/**
 * Middleware to parse cursor pagination query parameters
 */
const parsePagination = (req, res, next) => {
  try {
    const { limit, cursor, category, name } = req.query;
    
    // Default limit is 10, max is 100
    let parsedLimit = 10;
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (isNaN(parsed) || parsed <= 0) {
        throw new BadRequestError('Limit must be a positive integer.');
      }
      parsedLimit = Math.min(parsed, 100); // Caps limit at 100
    }

    // Filters object
    const filter = {};
    if (category) {
      filter.category = category;
    }
    if (name) {
      // Case-insensitive regex search for product names
      filter.name = { $regex: name, $options: 'i' };
    }

    req.pagination = {
      limit: parsedLimit,
      cursor: cursor || null,
      filter
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = parsePagination;
