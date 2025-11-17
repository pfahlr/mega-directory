/**
 * Base class for operational errors in the application
 * Operational errors are expected errors that can be handled gracefully
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    statusCode: number,
    message: string,
    isOperational = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found Error
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    const message = id
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(404, message, true, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * 400 Bad Request Error
 * Used for invalid client requests
 */
export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST') {
    super(400, message, true, code);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * 401 Unauthorized Error
 * Used when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, message, true, code);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * 403 Forbidden Error
 * Used when user is authenticated but doesn't have permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN') {
    super(403, message, true, code);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * 409 Conflict Error
 * Used for duplicate resources or conflicting operations
 */
export class ConflictError extends AppError {
  public readonly field?: string;

  constructor(message: string, field?: string, code = 'CONFLICT') {
    super(409, message, true, code);
    this.field = field;
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * 422 Unprocessable Entity Error
 * Used for validation errors
 */
export class ValidationError extends AppError {
  public readonly details?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    details?: Array<{ field: string; message: string }>,
    code = 'VALIDATION_ERROR'
  ) {
    super(422, message, true, code);
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    super(500, message, false, code);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
