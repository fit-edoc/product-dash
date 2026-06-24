const productRepository = require('../repositories/productRepository');
const cacheService = require('./cacheService');
const { decodeCursor } = require('../utils/cursorHelper');
const { formatPaginatedResponse } = require('../utils/paginationHelper');
const { NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

class ProductService {
  /**
   * Get products paginated by cursor
   * @param {Object} options 
   */
  async getProducts({ filter = {}, limit = 10, cursor = null } = {}) {
    const limitNum = parseInt(limit, 10);
    
    // 1. Try to fetch from Redis Cache
    const cachedResponse = await cacheService.getCatalog(limitNum, cursor, filter);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 2. Cache Miss: decode cursor and query MongoDB
    const decodedCursor = cursor ? decodeCursor(cursor) : null;
    const { products, dbExecutionTimeMs } = await productRepository.findAll({
      filter,
      limit: limitNum,
      decodedCursor
    });

    // 3. Format response (including limit+1 detection for nextCursor)
    const formatted = formatPaginatedResponse(products, limitNum);
    formatted.dbExecutionTimeMs = dbExecutionTimeMs;

    // 4. Save to Redis Cache
    await cacheService.setCatalog(limitNum, cursor, filter, formatted);

    return formatted;
  }

  /**
   * Get a single product by ID
   * @param {string} id 
   */
  async getProductById(id) {
    // 1. Try Cache
    const cachedProduct = await cacheService.getProduct(id);
    if (cachedProduct) {
      return cachedProduct;
    }

    // 2. Query MongoDB
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // 3. Save to Cache
    await cacheService.setProduct(id, product);

    return product;
  }

  /**
   * Create a new product
   * @param {Object} productData 
   */
  async createProduct(productData) {
    const product = await productRepository.create(productData);
    
    // Invalidate cached query pages (increment catalog version)
    await cacheService.incrementCatalogVersion();

    return product;
  }

  /**
   * Update product with optimistic concurrency locking
   * @param {string} id 
   * @param {Object} updateData 
   * @param {number} expectedVersion - version number before update
   */
  async updateProduct(id, updateData, expectedVersion) {
    if (!expectedVersion) {
      throw new Error('Version field is required for updates to ensure optimistic locking.');
    }

    const updatedProduct = await productRepository.updateOptimistic(id, updateData, expectedVersion);
    
    // If null, optimistic locking failed or product doesn't exist
    if (!updatedProduct) {
      // Check if product exists to distinguish between NotFound and Conflict
      const exists = await productRepository.findById(id);
      if (!exists) {
        throw new NotFoundError(`Product with ID ${id} not found`);
      }
      throw new ConflictError(`Optimistic locking failed: Product version ${expectedVersion} has changed. Please fetch the latest version and retry.`);
    }

    // Success: Invalidate specific detail cache and catalog cache version
    await cacheService.invalidateProduct(id);

    return updatedProduct;
  }

  /**
   * Delete product
   * @param {string} id 
   */
  async deleteProduct(id) {
    const deleted = await productRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Product with ID ${id} not found`);
    }

    // Invalidate detail cache and catalog pages
    await cacheService.invalidateProduct(id);

    return deleted;
  }
}

module.exports = new ProductService();
