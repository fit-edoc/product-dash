const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Configure environment
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('../src/config/database');
const { connectRedis, redisClient } = require('../src/config/redis');
const Product = require('../src/models/Product');
const productService = require('../src/services/productService');
const cacheService = require('../src/services/cacheService');
const generateProducts = require('./generateProducts');

const seedDatabase = async () => {
  try {
    const jsonPath = path.join(__dirname, 'mockProducts.json');
    if (!fs.existsSync(jsonPath)) {
      console.log('Mock products JSON not found. Generating...');
      generateProducts(100);
    }
    
    const mockProducts = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`Loaded ${mockProducts.length} mock products to seed.`);

    // Connect to databases
    await connectDB();
    await connectRedis();

    // 1. Clear database products
    console.log('Clearing existing product catalog in MongoDB...');
    await Product.deleteMany({});

    // 2. Insert mock data
    console.log('Inserting seed products...');
    const result = await Product.insertMany(mockProducts);
    console.log(`Successfully seeded ${result.length} products to database.`);

    // 3. Reset and bump cache version key to invalidate existing cached catalog pages
    console.log('Invalidating old Redis caches...');
    await cacheService.incrementCatalogVersion();

    // 4. Warm up the cache
    console.log('Warming Redis cache...');
    await cacheService.warmCache(productService);

    console.log('Seeding and Cache Warming complete!');
  } catch (error) {
    console.error('Seeding process failed:', error);
  } finally {
    // Graceful disconnect
    console.log('Closing database and redis connections...');
    try {
      await mongoose.connection.close();
      console.log('MongoDB disconnected.');
    } catch (e) {
      console.error('Error closing MongoDB connection:', e.message);
    }
    
    try {
      if (redisClient.isOpen) {
        await redisClient.quit();
        console.log('Redis client closed.');
      }
    } catch (e) {
      console.error('Error closing Redis connection:', e.message);
    }
    
    process.exit(0);
  }
};

// Execute if run directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
