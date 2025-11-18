/**
 * JWT utilities for user authentication
 */
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

export interface JWTPayload {
  userId: number;
  username: string;
  emailVerified: boolean;
  jti: string; // JWT ID for revocation
  iat?: number; // Issued at
  exp?: number; // Expiration
}

/**
 * Generate a unique JWT ID (jti) for token revocation
 */
export function generateJti(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Hash a JTI for storage in database
 */
export function hashJti(jti: string): string {
  return createHash('sha256').update(jti).digest('hex');
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JWTPayload, 'jti' | 'iat' | 'exp'>): {
  token: string;
  jti: string;
  expiresAt: Date;
} {
  const jti = generateJti();
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  const tokenPayload: JWTPayload = {
    ...payload,
    jti,
    iat: now,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });

  const expiresAt = new Date((now + expiresIn) * 1000);

  return {
    token,
    jti,
    expiresAt,
  };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify it's an object and has required fields
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      return decoded as unknown as JWTPayload;
    }

    return null;
  } catch (error) {
    // Token invalid, expired, or malformed
    return null;
  }
}

/**
 * Check if a token should be refreshed (>50% expired)
 */
export function shouldRefreshToken(payload: JWTPayload): boolean {
  if (!payload.iat || !payload.exp) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const lifetime = payload.exp - payload.iat;
  const elapsed = now - payload.iat;

  // Refresh if more than 50% of lifetime has passed
  return elapsed > lifetime * 0.5;
}

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token (constant-time comparison)
 */
export function validateCsrfToken(provided: string, expected: string): boolean {
  if (!provided || !expected || provided.length !== expected.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return providedBuffer.compare(expectedBuffer) === 0;
}
