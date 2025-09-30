import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { AppError, ValidationError } from '../errors';

interface ErrorResponse {
  error: string;
  details?: any;
  stack?: string;
  requestId?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log the error
  logger.error('Error occurred', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).userId,
  });

  // Handle Zod validation errors
  if (err instanceof z.ZodError) {
    const response: ErrorResponse = {
      error: 'Invalid input',
      details: err.errors,
    };

    if (process.env.NODE_ENV !== 'production') {
      response.stack = err.stack;
    }

    return res.status(400).json(response);
  }

  // Handle our custom AppError instances
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: err.message,
    };

    // Include details for validation errors
    if (err instanceof ValidationError && err.details) {
      response.details = err.details;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production' && err.isOperational) {
      response.stack = err.stack;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle database errors
  if ((err as any).code) {
    const dbError = err as any;

    // PostgreSQL unique violation
    if (dbError.code === '23505') {
      return res.status(409).json({
        error: 'Resource already exists',
      });
    }

    // PostgreSQL foreign key violation
    if (dbError.code === '23503') {
      return res.status(400).json({
        error: 'Invalid reference to related resource',
      });
    }

    // PostgreSQL not null violation
    if (dbError.code === '23502') {
      return res.status(400).json({
        error: 'Required field is missing',
      });
    }
  }

  // Handle unknown errors (500)
  // Don't expose internal error details in production
  const response: ErrorResponse = {
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  // Log programming errors separately for alerting
  if (!(err instanceof AppError) || !err.isOperational) {
    logger.error('Programming or unknown error', {
      error: err,
      stack: err.stack,
    });
  }

  return res.status(500).json(response);
};