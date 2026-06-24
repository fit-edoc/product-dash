class CustomError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends CustomError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ConflictError extends CustomError {
  constructor(message = 'Concurrency conflict detected. The resource has been updated by another process.') {
    super(message, 409);
  }
}

class BadRequestError extends CustomError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

class UnauthorizedError extends CustomError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

module.exports = {
  CustomError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnauthorizedError
};
