const cluster = require('cluster');
const os = require('os');
const dotenv = require('dotenv');
const path = require('path');

// Configure environment variables first
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// cluster.isPrimary is available in Node 16+, cluster.isMaster in older versions
// Determine concurrency: default to 1 worker in production/cloud, or use host CPU count in dev
const WEB_CONCURRENCY = process.env.WEB_CONCURRENCY 
  ? parseInt(process.env.WEB_CONCURRENCY, 10) 
  : (process.env.NODE_ENV === 'production' ? 1 : os.cpus().length);

const shouldCluster = WEB_CONCURRENCY > 1;

const startSingleServer = async () => {
  try {
    // Connect to MongoDB and Redis
    await connectDB();
    await connectRedis();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`Server started. Listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error(`Server failed to start: ${err.message}`);
    process.exit(1);
  }
};

if (shouldCluster) {
  const isPrimary = cluster.isPrimary !== undefined ? cluster.isPrimary : cluster.isMaster;

  if (isPrimary) {
    // If we are in test mode, do not spawn a cluster
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    logger.info(`Primary cluster process ${process.pid} is running`);
    logger.info(`Forking server on ${WEB_CONCURRENCY} worker threads...`);

    // Spawn workers
    for (let i = 0; i < WEB_CONCURRENCY; i++) {
      cluster.fork();
    }

    // Handle crash recovery
    cluster.on('exit', (worker, code, signal) => {
      logger.error(`Worker process ${worker.process.pid} died. Code: ${code}, Signal: ${signal}. Spawning a replacement worker...`);
      cluster.fork();
    });
  } else {
    // Worker process code
    const startWorkerServer = async () => {
      try {
        // Connect to MongoDB and Redis
        await connectDB();
        await connectRedis();

        // Start listening
        app.listen(PORT, () => {
          logger.info(`Worker process ${process.pid} started. Listening on port ${PORT}`);
        });
      } catch (err) {
        logger.error(`Worker process ${process.pid} failed to start: ${err.message}`);
        process.exit(1);
      }
    };

    startWorkerServer();
  }
} else {
  // Non-clustered mode (default for Railway and single CPU containers)
  if (process.env.NODE_ENV !== 'test') {
    startSingleServer();
  }
}
