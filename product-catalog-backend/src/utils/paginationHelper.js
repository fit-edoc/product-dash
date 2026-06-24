const { encodeCursor } = require('./cursorHelper');

/**
 * Builds a mongoose filter query incorporating cursor-based pagination
 * @param {Object} decodedCursor - The decoded cursor object { createdAt, id }
 * @param {Object} baseFilter - Other filters (e.g., { category: 'electronics' })
 * @returns {Object} Combined mongoose filter
 */
const buildCursorFilter = (decodedCursor, baseFilter = {}) => {
  if (!decodedCursor) return baseFilter;

  const { createdAt, id } = decodedCursor;
  
  // We assume descending sort: newer items first.
  // createdAt < cursor.createdAt OR (createdAt === cursor.createdAt AND _id < cursor.id)
  const cursorFilter = {
    $or: [
      { createdAt: { $lt: new Date(createdAt) } },
      {
        createdAt: new Date(createdAt),
        _id: { $lt: id }
      }
    ]
  };

  if (Object.keys(baseFilter).length === 0) {
    return cursorFilter;
  }

  // Combine baseFilter with the cursorFilter
  return {
    $and: [
      baseFilter,
      cursorFilter
    ]
  };
};

/**
 * Formats the paginated database results with cursor metadata
 * @param {Array} items - List of items fetched (must include limit + 1 to check for hasMore)
 * @param {number} limit - Requested limit
 * @returns {Object} Object containing paginated items and cursor metadata
 */
const formatPaginatedResponse = (items, limit) => {
  const hasMore = items.length > limit;
  const paginatedItems = hasMore ? items.slice(0, limit) : items;

  let nextCursor = null;
  if (paginatedItems.length > 0 && hasMore) {
    const lastItem = paginatedItems[paginatedItems.length - 1];
    nextCursor = encodeCursor({
      createdAt: lastItem.createdAt,
      id: lastItem._id.toString()
    });
  }

  return {
    items: paginatedItems,
    pagination: {
      limit,
      count: paginatedItems.length,
      hasMore,
      nextCursor
    }
  };
};

module.exports = {
  buildCursorFilter,
  formatPaginatedResponse
};
