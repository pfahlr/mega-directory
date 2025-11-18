/**
 * Magic link code generator
 * Generates cryptographically secure 12-character codes for magic link authentication
 */
import { randomBytes } from 'crypto';
import { prisma } from '../db';

// Character set: A-Z, a-z, 0-9 (62 characters)
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE_LENGTH = 12;
const MAGIC_LINK_EXPIRY_MINUTES = 5;

/**
 * Generate a cryptographically secure random code
 * Uses crypto.randomBytes for high-quality randomness
 * @returns 12-character code (A-Z, a-z, 0-9)
 */
export function generateMagicLinkCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    // Use modulo to map byte values to charset indices
    const index = bytes[i] % CHARSET.length;
    code += CHARSET[index];
  }

  return code;
}

/**
 * Generate a unique magic link code by checking database
 * Retries up to maxAttempts times if code already exists
 * @param maxAttempts Maximum number of generation attempts (default: 10)
 * @returns Unique 12-character code
 */
export async function generateUniqueMagicLinkCode(maxAttempts: number = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateMagicLinkCode();

    // Check if code already exists
    const existing = await prisma.magicLink.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  // If we get here, we've failed to generate a unique code after maxAttempts
  // This is extremely unlikely with 62^12 possibilities (~3.2e21)
  throw new Error('Failed to generate unique magic link code');
}

/**
 * Calculate expiration time for magic link
 * @returns Date object representing expiration time (5 minutes from now)
 */
export function getMagicLinkExpiry(): Date {
  const now = new Date();
  return new Date(now.getTime() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Check if a magic link is expired
 * @param expiresAt Expiration timestamp from database
 * @returns true if expired, false otherwise
 */
export function isMagicLinkExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Invalidate all unused magic links for a user
 * This is called when creating a new magic link to ensure old links can't be used
 * @param userId User ID
 * @returns Number of magic links invalidated
 */
export async function invalidateUnusedMagicLinks(userId: number): Promise<number> {
  const now = new Date();

  const result = await prisma.magicLink.updateMany({
    where: {
      userId,
      usedAt: null, // Only invalidate unused links
    },
    data: {
      usedAt: now, // Mark as used to prevent future use
    },
  });

  return result.count;
}
