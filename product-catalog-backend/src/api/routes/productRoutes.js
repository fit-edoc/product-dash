const express = require('express');
const productController = require('../controllers/productController');
const parsePagination = require('../middlewares/pagination');
const authMiddleware = require('../middlewares/auth');
const routeCache = require('../middlewares/cache');

const router = express.Router();

// GET Cache performance statistics
router.get('/metrics/cache', productController.getCacheMetrics);

// GET Paginated list of products (Uses route caching, TTL 5 mins = 300s)
router.get('/', parsePagination, routeCache(300), productController.getProducts);

// GET Single product details (Uses route caching, TTL 10 mins = 600s)
router.get('/:id', routeCache(600), productController.getProductById);

// POST Create new product (Protected, invalidates catalog version)
router.post('/', authMiddleware, productController.createProduct);

// PUT Update existing product (Protected, optimistic locking, invalidates detail + catalog)
router.put('/:id', authMiddleware, productController.updateProduct);

// DELETE Remove product (Protected, invalidates detail + catalog)
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
