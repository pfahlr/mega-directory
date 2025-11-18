import { Request, Response, NextFunction } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { ZodError } from 'zod';
import { AppError } from '../errors';

/**
 * Centralized error handling middleware
 * Must be registered as the last middleware in the application
 *
 * Handles:
 * - AppError instances (operational errors)
 * - Prisma errors (database errors)
 * - Zod validation errors
 * - Unknown errors (programming errors)
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log all errors for debugging
  console.error('Error caught by error handler:', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    return handlePrismaError(err, res);
  }

  // Handle Prisma initialization errors
  if (err instanceof PrismaClientInitializationError) {
    console.error('Prisma initialization error:', err);
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      code: 'DATABASE_UNAVAILABLE'
    });
  }

  // Handle Prisma validation errors
  if (err instanceof PrismaClientValidationError) {
    console.error('Prisma validation error:', err);
    return res.status(400).json({
      error: 'Invalid request data',
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid data for the database operation'
    });
  }

  // Handle Zod validation errors (should be caught by validation middleware, but just in case)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      }))
    });
  }

  // Handle AppError instances (our custom errors)
  if (err instanceof AppError) {
    const response: any = {
      error: err.message,
      code: err.code
    };

    // Include additional properties if they exist
    if ('field' in err && err.field) {
      response.field = err.field;
    }
    if ('details' in err && err.details) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle unknown errors (programming errors)
  // Don't expose internal error details in production
  console.error('Unhandled error:', err);

  const isProduction = process.env.NODE_ENV === 'production';

  return res.status(500).json({
    error: isProduction ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    ...(!isProduction && {
      stack: err.stack,
      details: err
    })
  });
};

/**
 * Handle Prisma-specific errors and map them to appropriate HTTP status codes
 */
function handlePrismaError(err: PrismaClientKnownRequestError, res: Response) {
  switch (err.code) {
    // Unique constraint violation
    case 'P2002': {
      const target = err.meta?.target as string[] | undefined;
      const field = target?.[0] || 'field';
      return res.status(409).json({
        error: 'Unique constraint violation',
        message: `A record with this ${field} already exists`,
        code: 'DUPLICATE',
        field
      });
    }

    // Record not found for operation
    case 'P2025':
      return res.status(404).json({
        error: 'Record not found',
        message: 'The requested record does not exist',
        code: 'NOT_FOUND'
      });

    // Foreign key constraint failed
    case 'P2003': {
      const field = err.meta?.field_name as string | undefined;
      return res.status(400).json({
        error: 'Foreign key constraint failed',
        message: field
          ? `Invalid reference: ${field}`
          : 'The operation references a non-existent record',
        code: 'INVALID_REFERENCE',
        field
      });
    }

    // Dependent records exist (cannot delete)
    case 'P2014':
      return res.status(409).json({
        error: 'Relation violation',
        message: 'Cannot delete record because dependent records exist',
        code: 'HAS_DEPENDENTS'
      });

    // Required field missing
    case 'P2012':
      return res.status(400).json({
        error: 'Missing required field',
        message: 'A required field is missing in the request',
        code: 'MISSING_FIELD'
      });

    // Value too long for field
    case 'P2000': {
      const field = err.meta?.column_name as string | undefined;
      return res.status(400).json({
        error: 'Value too long',
        message: field
          ? `Value for ${field} is too long`
          : 'One or more values exceed maximum length',
        code: 'VALUE_TOO_LONG',
        field
      });
    }

    // Invalid value for field type
    case 'P2006': {
      const field = err.meta?.column_name as string | undefined;
      return res.status(400).json({
        error: 'Invalid value type',
        message: field
          ? `Invalid value type for ${field}`
          : 'One or more values have invalid types',
        code: 'INVALID_TYPE',
        field
      });
    }

    // Default: unknown Prisma error
    default:
      console.error('Unhandled Prisma error code:', err.code);
      return res.status(500).json({
        error: 'Database error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'A database error occurred',
        code: 'DATABASE_ERROR',
        prismaCode: err.code
      });
  }
}
