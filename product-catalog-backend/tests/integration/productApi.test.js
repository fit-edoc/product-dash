const request = require('supertest');
const app = require('../../src/app');
const productService = require('../../src/services/productService');
const cacheService = require('../../src/services/cacheService');

// Mock services to avoid requiring active Mongo & Redis during API tests
jest.mock('../../src/services/productService');
jest.mock('../../src/services/cacheService');

describe('Product Catalog API Integration Tests', () => {
  let authToken;

  beforeAll(async () => {
    // Obtain a mock JWT token from the developer token route
    const response = await request(app).get('/api/auth/token');
    authToken = response.body.header;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default cache service mock responses
    cacheService.getCacheMetrics.mockResolvedValue({
      status: 'Redis connected',
      hits: 15,
      misses: 5,
      hitRate: '75.00%'
    });
  });

  describe('GET /api/products', () => {
    it('should fetch products list successfully', async () => {
      const mockResult = {
        items: [
          { _id: '1', name: 'Product 1', price: 99.99, category: 'Electronics', version: 1 }
        ],
        pagination: { limit: 10, count: 1, hasMore: false, nextCursor: null }
      };
      
      productService.getProducts.mockResolvedValue(mockResult);

      const res = await request(app)
        .get('/api/products')
        .query({ limit: 10 });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockResult);
      expect(productService.getProducts).toHaveBeenCalledWith({
        filter: {},
        limit: 10,
        cursor: null
      });
    });

    it('should validate and reject negative limits', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ limit: -5 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.name).toEqual('BadRequestError');
    });
  });

  describe('POST /api/products', () => {
    it('should reject requests without authorization token', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'New Product', price: 29.99, category: 'Books' });

      expect(res.statusCode).toEqual(401);
    });

    it('should create product when auth token is present', async () => {
      const mockProduct = { _id: '123', name: 'New Product', price: 29.99, category: 'Books', version: 1 };
      productService.createProduct.mockResolvedValue(mockProduct);

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', authToken)
        .send({ name: 'New Product', price: 29.99, category: 'Books' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual(mockProduct);
      expect(productService.createProduct).toHaveBeenCalledWith({
        name: 'New Product',
        price: 29.99,
        category: 'Books',
        stock: 0
      });
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should require expected version for optimistic lock check', async () => {
      const res = await request(app)
        .put('/api/products/123')
        .set('Authorization', authToken)
        .send({ name: 'Updated name' }); // missing version info

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('Product version is required');
    });

    it('should update product if version is supplied in headers', async () => {
      const mockUpdated = { _id: '123', name: 'Updated name', price: 29.99, category: 'Books', version: 2 };
      productService.updateProduct.mockResolvedValue(mockUpdated);

      const res = await request(app)
        .put('/api/products/123')
        .set('Authorization', authToken)
        .set('X-Product-Version', '1') // version in header
        .send({ name: 'Updated name' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockUpdated);
      expect(productService.updateProduct).toHaveBeenCalledWith('123', { name: 'Updated name' }, 1);
    });
  });

  describe('GET /api/products/metrics/cache', () => {
    it('should return cache metrics', async () => {
      const res = await request(app).get('/api/products/metrics/cache');
      expect(res.statusCode).toEqual(200);
      expect(res.body.hitRate).toEqual('75.00%');
    });
  });
});
