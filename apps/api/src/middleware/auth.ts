import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';

declare global {
  namespace Express {
    interface Request {
      admin?: JwtPayload | string;
    }
  }
}

export interface AuthConfig {
  adminJwtSecret: string;
  adminJwtIssuer: string;
  adminJwtAudience: string;
  crawlerBearerToken: string;
  adminTokenTtlSeconds?: number;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const headerSource =
    (typeof req.get === 'function' && req.get('authorization')) ||
    (typeof req.header === 'function' && req.header('authorization')) ||
    req.headers?.authorization ||
    (req.headers as Record<string, string | undefined>)?.Authorization;

  if (!headerSource) {
    return null;
  }

  const [scheme, token] = headerSource.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Middleware to require admin JWT authentication
 */
export function requireAdminAuth(config: AuthConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('Admin token missing or invalid');
    }

    try {
      const payload = jwt.verify(token, config.adminJwtSecret, {
        issuer: config.adminJwtIssuer,
        audience: config.adminJwtAudience,
      });
      req.admin = payload;
      return next();
    } catch (_err) {
      throw new UnauthorizedError('Admin token missing or invalid');
    }
  };
}

/**
 * Middleware to require crawler bearer token authentication
 */
export function requireCrawlerToken(config: AuthConfig): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req);
    if (!token || token !== config.crawlerBearerToken) {
      throw new UnauthorizedError('Crawler token missing or invalid');
    }

    return next();
  };
}

/**
 * Generate admin JWT token
 */
export function generateAdminToken(
  email: string,
  config: AuthConfig,
  expiresIn: number
): string {
  return jwt.sign(
    { sub: email.toLowerCase(), role: 'admin', type: 'access' },
    config.adminJwtSecret,
    {
      issuer: config.adminJwtIssuer,
      audience: config.adminJwtAudience,
      expiresIn,
    }
  );
}
