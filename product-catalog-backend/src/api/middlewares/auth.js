const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../../utils/errors');

/**
 * JWT Authentication Middleware
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is missing or invalid. Please supply: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'supersecretjwtsecretkey123456!';
    
    // Verify the JWT token
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    
    next();
  } catch (error) {
    let message = 'Unauthorized access.';
    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired.';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token.';
    }
    next(new UnauthorizedError(message));
  }
};

module.exports = authMiddleware;
