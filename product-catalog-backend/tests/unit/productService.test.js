const productService = require('../../src/services/productService');
const productRepository = require('../../src/repositories/productRepository');
const cacheService = require('../../src/services/cacheService');
const { NotFoundError, ConflictError } = require('../../src/utils/errors');

// Mock dependencies
jest.mock('../../src/repositories/productRepository');
jest.mock('../../src/services/cacheService');
jest.mock('../../src/utils/cursorHelper');
jest.mock('../../src/utils/paginationHelper');

const { decodeCursor } = require('../../src/utils/cursorHelper');
const { formatPaginatedResponse } = require('../../src/utils/paginationHelper');

describe('ProductService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should return cached response if hit', async () => {
      const mockCached = { items: [{ name: 'Cached Prod' }], pagination: {} };
      cacheService.getCatalog.mockResolvedValue(mockCached);

      const result = await productService.getProducts({ limit: 10 });

      expect(cacheService.getCatalog).toHaveBeenCalledWith(10, null, {});
      expect(productRepository.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(mockCached);
    });

    it('should fetch from database, format, and save to cache if miss', async () => {
      cacheService.getCatalog.mockResolvedValue(null);
      
      const mockDbProducts = [{ name: 'Db Prod', createdAt: new Date(), _id: '123' }];
      productRepository.findAll.mockResolvedValue({
        products: mockDbProducts,
        dbExecutionTimeMs: 15
      });

      const mockFormatted = { items: mockDbProducts, pagination: { hasMore: false } };
      formatPaginatedResponse.mockReturnValue(mockFormatted);

      const result = await productService.getProducts({ limit: 10 });

      expect(cacheService.getCatalog).toHaveBeenCalledWith(10, null, {});
      expect(productRepository.findAll).toHaveBeenCalledWith({
        filter: {},
        limit: 10,
        decodedCursor: null
      });
      expect(formatPaginatedResponse).toHaveBeenCalledWith(mockDbProducts, 10);
      expect(cacheService.setCatalog).toHaveBeenCalledWith(10, null, {}, {
        items: mockDbProducts,
        pagination: { hasMore: false },
        dbExecutionTimeMs: 15
      });
      expect(result).toEqual({
        items: mockDbProducts,
        pagination: { hasMore: false },
        dbExecutionTimeMs: 15
      });
    });
  });

  describe('getProductById', () => {
    it('should return cached product if hit', async () => {
      const mockProduct = { _id: '123', name: 'Product A' };
      cacheService.getProduct.mockResolvedValue(mockProduct);

      const result = await productService.getProductById('123');

      expect(cacheService.getProduct).toHaveBeenCalledWith('123');
      expect(productRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should query repository and cache it on cache miss', async () => {
      cacheService.getProduct.mockResolvedValue(null);
      const mockProduct = { _id: '123', name: 'Product A' };
      productRepository.findById.mockResolvedValue(mockProduct);

      const result = await productService.getProductById('123');

      expect(productRepository.findById).toHaveBeenCalledWith('123');
      expect(cacheService.setProduct).toHaveBeenCalledWith('123', mockProduct);
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundError if product not found', async () => {
      cacheService.getProduct.mockResolvedValue(null);
      productRepository.findById.mockResolvedValue(null);

      await expect(productService.getProductById('123')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProduct', () => {
    it('should update successfully and invalidate cache', async () => {
      const mockUpdated = { _id: '123', name: 'Updated name', version: 2 };
      productRepository.updateOptimistic.mockResolvedValue(mockUpdated);

      const result = await productService.updateProduct('123', { name: 'Updated name' }, 1);

      expect(productRepository.updateOptimistic).toHaveBeenCalledWith('123', { name: 'Updated name' }, 1);
      expect(cacheService.invalidateProduct).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockUpdated);
    });

    it('should throw ConflictError if version is outdated (optimistic locking fail)', async () => {
      productRepository.updateOptimistic.mockResolvedValue(null);
      productRepository.findById.mockResolvedValue({ _id: '123', name: 'Existing Prod', version: 2 }); // version in DB is already 2

      await expect(
        productService.updateProduct('123', { name: 'New name' }, 1) // we sent expected version 1
      ).rejects.toThrow(ConflictError);

      expect(productRepository.updateOptimistic).toHaveBeenCalledWith('123', { name: 'New name' }, 1);
    });

    it('should throw NotFoundError if product does not exist on update failure', async () => {
      productRepository.updateOptimistic.mockResolvedValue(null);
      productRepository.findById.mockResolvedValue(null); // doesn't exist

      await expect(
        productService.updateProduct('123', { name: 'New name' }, 1)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
