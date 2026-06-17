import { ZodError } from 'zod';

export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || (error.name === 'CastError' ? 400 : 500);

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with this value already exists.' });
  }

  return res.status(statusCode).json({
    message: error.message || 'Something went wrong',
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
}
