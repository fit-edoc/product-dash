const productService = require('../../services/productService');
const cacheService = require('../../services/cacheService');
const { BadRequestError } = require('../../utils/errors');
const logger = require('../../utils/logger');

class ProductController {
  /**
   * GET /products
   */
  async getProducts(req, res, next) {
    try {
      const { limit, cursor, filter } = req.pagination;
      const result = await productService.getProducts({ filter, limit, cursor });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /products/:id
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /products
   */
  async createProduct(req, res, next) {
    try {
      const { name, description, price, category, stock } = req.body;
      
      if (!name || price === undefined || !category) {
        throw new BadRequestError('Name, price, and category are required fields.');
      }

      const product = await productService.createProduct({
        name,
        description,
        price,
        category,
        stock: stock !== undefined ? stock : 0
      });

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /products/:id
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, price, category, stock } = req.body;
      
      // Determine expected version for Optimistic Concurrency Control (OCC)
      // Check in body first, then headers (e.g. X-Product-Version or If-Match)
      let expectedVersion = req.body.version;
      
      if (!expectedVersion && req.headers['x-product-version']) {
        expectedVersion = parseInt(req.headers['x-product-version'], 10);
      }
      
      if (!expectedVersion && req.headers['if-match']) {
        // ETag format is usually "W/version" or just version
        const ifMatch = req.headers['if-match'].replace(/[^0-9]/g, '');
        expectedVersion = parseInt(ifMatch, 10);
      }

      if (expectedVersion === undefined || isNaN(expectedVersion)) {
        throw new BadRequestError('Product version is required to update (via req.body.version, X-Product-Version header, or If-Match header) to enforce optimistic locking.');
      }

      // Collect data fields to update
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (category !== undefined) updateData.category = category;
      if (stock !== undefined) updateData.stock = stock;

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestError('No update fields provided.');
      }

      const updated = await productService.updateProduct(id, updateData, expectedVersion);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /products/:id
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      await productService.deleteProduct(id);
      res.status(200).json({ message: `Product ${id} deleted successfully.` });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /products/metrics/cache
   */
  async getCacheMetrics(req, res, next) {
    try {
      const metrics = await cacheService.getCacheMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
