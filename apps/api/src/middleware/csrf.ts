/**
 * CSRF protection middleware
 * Validates CSRF tokens for state-changing requests (POST, PUT, DELETE, PATCH)
 */
import type { Request, Response, NextFunction } from 'express';
import { validateCsrfToken } from '../utils/jwt';

// Extend Request type to include csrf token
declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

/**
 * CSRF protection middleware
 * Validates CSRF token from header or body for state-changing requests
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Only check CSRF for state-changing methods
  const methodsToCheck = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!methodsToCheck.includes(req.method)) {
    return next();
  }

  // Get CSRF token from header or body
  const csrfToken = req.headers?.['x-csrf-token'] as string || req.body?.csrfToken;

  // Get expected CSRF token from session (stored in cookie or request)
  const expectedCsrfToken = req.csrfToken;

  if (!csrfToken || !expectedCsrfToken) {
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token is required for this request',
    });
    return;
  }

  // Validate CSRF token (constant-time comparison)
  if (!validateCsrfToken(csrfToken, expectedCsrfToken)) {
    res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed',
    });
    return;
  }

  // CSRF token is valid, proceed
  return next();
}

/**
 * Attach CSRF token to request object for validation
 * This should be called after authentication middleware
 */
export function attachCsrfToken(csrfToken: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.csrfToken = csrfToken;
    next();
  };
}
