/**
 * Centralized error handler middleware.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with invalid ID format: ${err.value}`;
  }

  // Handle Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyValue).join(', ');
    message = `Duplicate field value entered for [${fields}]. Must be unique.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

/**
 * 404 Route Not Found handler.
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Resource not found at endpoint - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
