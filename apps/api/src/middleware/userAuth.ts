/**
 * User authentication middleware for public users
 * Handles JWT validation and user session management
 */
import type { Request, Response, NextFunction } from 'express';
import { verifyToken, shouldRefreshToken, generateToken, JWTPayload } from '../utils/jwt';
import { verifySession, getUserById } from '../services/userService';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string | null;
        emailVerified: boolean;
        photo: string | null;
        about: string | null;
        createdAt: Date;
      };
      tokenPayload?: JWTPayload;
    }
  }
}

/**
 * Extract token from Authorization header or cookies
 */
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const cookieToken = req.cookies?.auth_token;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Optional authentication middleware
 * Attaches user to request if valid token is provided, but doesn't require it
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    // No token provided, continue without user
    return next();
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    // Invalid token, continue without user (don't error)
    return next();
  }

  // Verify session exists and hasn't been revoked
  const sessionValid = await verifySession(payload.userId, payload.jti);
  if (!sessionValid) {
    // Session invalid or expired, continue without user
    return next();
  }

  // Get full user data
  const user = await getUserById(payload.userId);
  if (!user) {
    // User not found, continue without user
    return next();
  }

  // Attach user and token payload to request
  req.user = user as any;
  req.tokenPayload = payload;

  // Check if token should be refreshed (>50% expired)
  if (shouldRefreshToken(payload)) {
    // Generate new token
    const { token: newToken, expiresAt } = generateToken({
      userId: user.id,
      username: user.username,
      emailVerified: user.emailVerified,
    });

    // Set new token in cookie
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
    });
  }

  next();
}

/**
 * Required authentication middleware
 * Returns 401 if no valid token is provided
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
    return;
  }

  // Verify session exists and hasn't been revoked
  const sessionValid = await verifySession(payload.userId, payload.jti);
  if (!sessionValid) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Session invalid or expired',
    });
    return;
  }

  // Get full user data
  const user = await getUserById(payload.userId);
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'User not found',
    });
    return;
  }

  // Attach user and token payload to request
  req.user = user as any;
  req.tokenPayload = payload;

  // Check if token should be refreshed (>50% expired)
  if (shouldRefreshToken(payload)) {
    // Generate new token
    const { token: newToken, expiresAt } = generateToken({
      userId: user.id,
      username: user.username,
      emailVerified: user.emailVerified,
    });

    // Set new token in cookie
    res.cookie('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
    });
  }

  next();
}
