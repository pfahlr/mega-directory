import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  InternalServerError
} from '../../src/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(400, 'Test error', true, 'TEST_CODE');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.code).toBe('TEST_CODE');
      expect(error.stack).toBeDefined();
    });

    it('should default isOperational to true', () => {
      const error = new AppError(500, 'Error');
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError(500, 'Error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('NotFoundError', () => {
    it('should create 404 error with resource name', () => {
      const error = new NotFoundError('User');

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.isOperational).toBe(true);
    });

    it('should create 404 error with resource name and ID', () => {
      const error = new NotFoundError('User', 123);

      expect(error.message).toBe('User with id 123 not found');
      expect(error.statusCode).toBe(404);
    });

    it('should work with string IDs', () => {
      const error = new NotFoundError('User', 'abc-123');

      expect(error.message).toBe('User with id abc-123 not found');
    });
  });

  describe('BadRequestError', () => {
    it('should create 400 error', () => {
      const error = new BadRequestError('Invalid input');

      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.isOperational).toBe(true);
    });

    it('should allow custom error code', () => {
      const error = new BadRequestError('Invalid input', 'CUSTOM_CODE');
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });

  describe('UnauthorizedError', () => {
    it('should create 401 error with default message', () => {
      const error = new UnauthorizedError();

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Invalid token');
      expect(error.message).toBe('Invalid token');
    });

    it('should accept custom code', () => {
      const error = new UnauthorizedError('Invalid token', 'INVALID_TOKEN');
      expect(error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('ForbiddenError', () => {
    it('should create 403 error with default message', () => {
      const error = new ForbiddenError();

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access denied');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.isOperational).toBe(true);
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('Insufficient permissions');
      expect(error.message).toBe('Insufficient permissions');
    });
  });

  describe('ConflictError', () => {
    it('should create 409 error', () => {
      const error = new ConflictError('Resource already exists');

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
      expect(error.code).toBe('CONFLICT');
      expect(error.isOperational).toBe(true);
    });

    it('should include field name', () => {
      const error = new ConflictError('Email already exists', 'email');

      expect(error.field).toBe('email');
    });

    it('should accept custom code', () => {
      const error = new ConflictError('Duplicate', 'email', 'DUPLICATE_EMAIL');
      expect(error.code).toBe('DUPLICATE_EMAIL');
    });
  });

  describe('ValidationError', () => {
    it('should create 422 error', () => {
      const error = new ValidationError('Validation failed');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.statusCode).toBe(422);
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should include validation details', () => {
      const details = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'age', message: 'Must be at least 18' }
      ];
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
      expect(error.details).toHaveLength(2);
    });
  });

  describe('InternalServerError', () => {
    it('should create 500 error with default message', () => {
      const error = new InternalServerError();

      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(false); // Not operational
    });

    it('should accept custom message', () => {
      const error = new InternalServerError('Database connection failed');
      expect(error.message).toBe('Database connection failed');
    });

    it('should mark as non-operational', () => {
      const error = new InternalServerError();
      expect(error.isOperational).toBe(false);
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const notFound = new NotFoundError('User', 123);
      const badRequest = new BadRequestError('Invalid');
      const unauthorized = new UnauthorizedError();

      expect(notFound instanceof NotFoundError).toBe(true);
      expect(notFound instanceof AppError).toBe(true);
      expect(notFound instanceof Error).toBe(true);

      expect(badRequest instanceof BadRequestError).toBe(true);
      expect(badRequest instanceof AppError).toBe(true);

      expect(unauthorized instanceof UnauthorizedError).toBe(true);
      expect(unauthorized instanceof AppError).toBe(true);
    });

    it('should work with instanceof checks', () => {
      const errors = [
        new NotFoundError('User'),
        new BadRequestError('Bad'),
        new UnauthorizedError(),
        new ForbiddenError(),
        new ConflictError('Conflict'),
        new ValidationError('Validation'),
        new InternalServerError()
      ];

      errors.forEach(error => {
        expect(error instanceof AppError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });
  });
});
