const Product = require('../models/Product');
const { buildCursorFilter } = require('../utils/paginationHelper');
const logger = require('../utils/logger');

class ProductRepository {
  /**
   * Find paginated products using cursor pagination
   * @param {Object} filter - Filter criteria (e.g., category)
   * @param {number} limit - Number of items to return
   * @param {Object|null} decodedCursor - Decoded cursor object { createdAt, id }
   */
  async findAll({ filter = {}, limit = 10, decodedCursor = null } = {}) {
    const start = Date.now();
    const finalFilter = buildCursorFilter(decodedCursor, filter);
    
    // Fetch limit + 1 to check if there is a next page
    const products = await Product.find(finalFilter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    const duration = Date.now() - start;
    logger.debug(`ProductRepository.findAll executed in ${duration}ms`, { 
      filter: finalFilter, 
      limit, 
      count: products.length 
    });

    return {
      products,
      dbExecutionTimeMs: duration
    };
  }

  /**
   * Find product by ID
   * @param {string} id 
   */
  async findById(id) {
    return Product.findById(id).lean();
  }

  /**
   * Create new product
   * @param {Object} productData 
   */
  async create(productData) {
    const product = new Product(productData);
    return product.save();
  }

  /**
   * Update product with optimistic locking
   * @param {string} id 
   * @param {Object} updateData 
   * @param {number} expectedVersion 
   */
  async updateOptimistic(id, updateData, expectedVersion) {
    const start = Date.now();
    
    // We increment version field by 1 and check that the version matches expectedVersion
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, version: expectedVersion },
      {
        $set: updateData,
        $inc: { version: 1 }
      },
      { new: true, runValidators: true }
    );

    const duration = Date.now() - start;
    logger.debug(`ProductRepository.updateOptimistic executed in ${duration}ms`, {
      id,
      expectedVersion,
      success: !!updatedProduct
    });

    return updatedProduct;
  }

  /**
   * Delete product by ID
   * @param {string} id 
   */
  async delete(id) {
    return Product.findByIdAndDelete(id);
  }

  /**
   * Count total documents matching filter
   * @param {Object} filter 
   */
  async count(filter = {}) {
    return Product.countDocuments(filter);
  }
}

module.exports = new ProductRepository();
