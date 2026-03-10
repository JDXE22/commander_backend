export class AppError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message, 'BAD_REQUEST');
    this.name = 'BadRequestError';
  }
}

export const errorHandler = (err, req, res, next) => {
  // Mongoose: duplicate key
  if (err.name === 'MongoServerError' && err.message.includes('E11000')) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'A command with this trigger already exists',
    });
  }

  if (err.name === 'CastError') {
    return res
      .status(400)
      .json({ error: 'INVALID_ID', message: 'Malformed ID' });
  }

  if (err.name === 'ValidationError') {
    return res
      .status(400)
      .json({ error: 'VALIDATION_ERROR', message: err.message });
  }

  if (err instanceof AppError) {
    return res
      .status(err.statusCode)
      .json({ error: err.code, message: err.message });
  }

  console.error(err.stack);
  return res
    .status(500)
    .json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
};
