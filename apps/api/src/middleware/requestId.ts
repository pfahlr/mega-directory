import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID middleware
 *
 * Adds a unique request ID to each request for tracking and correlation across logs.
 * The request ID can be provided by the client via X-Request-ID header or will be generated.
 */

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use client-provided request ID if available, otherwise generate one
  const requestId = (req.headers?.['x-request-id'] as string) || randomUUID();

  // Attach to request object
  req.id = requestId;

  // Send back in response headers
  res.setHeader('X-Request-ID', requestId);

  next();
}
