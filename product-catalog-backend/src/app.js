const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const productRoutes = require('./api/routes/productRoutes');
const loggingMiddleware = require('./api/middlewares/logging');
const { CustomError } = require('./utils/errors');
const logger = require('./utils/logger');

const app = express();

// Standard Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request/Response logger using Winston
app.use(loggingMiddleware);

// Developer Token Route for testing auth-protected routes
app.get('/api/auth/token', (req, res) => {
  const secret = process.env.JWT_SECRET || 'supersecretjwtsecretkey123456!';
  // Generate a mock token valid for 2 hours
  const token = jwt.sign(
    { userId: 'dev-user-id', role: 'admin' }, 
    secret, 
    { expiresIn: '2h' }
  );
  res.json({ token, scheme: 'Bearer', header: `Bearer ${token}` });
});

// Register API Routes
app.use('/api/products', productRoutes);

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  // Check if it's our custom API Error
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({
      status: 'error',
      name: err.name,
      message: err.message
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      status: 'error',
      name: 'ValidationError',
      message: 'Validation failed',
      errors: messages
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      name: 'CastError',
      message: `Invalid format for field ${err.path}: ${err.value}`
    });
  }

  // Handle SyntaxError in JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      name: 'JSONSyntaxError',
      message: 'Invalid JSON payload format'
    });
  }

  // Fallback: Internal Server Error
  logger.error('Unhandled Server Error: %s', err.stack);
  res.status(500).json({
    status: 'error',
    name: 'InternalServerError',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

module.exports = app;
