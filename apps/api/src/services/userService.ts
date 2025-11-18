/**
 * User service for authentication and user management
 */
import { prisma } from '../db';
import { generateToken, hashJti, generateCsrfToken } from '../utils/jwt';
import { generateUniqueUsername } from '../utils/usernameGenerator';
import {
  generateUniqueMagicLinkCode,
  getMagicLinkExpiry,
  isMagicLinkExpired,
  invalidateUnusedMagicLinks,
} from '../utils/magicLinkGenerator';
import { sendMagicLinkEmail } from '../email/emailService';
import { hash, verify } from '@node-rs/argon2';

export interface CreateAnonymousUserResult {
  user: {
    id: number;
    username: string;
    email: string | null;
    emailVerified: boolean;
  };
  token: string;
  csrfToken: string;
  expiresAt: Date;
}

/**
 * Create an anonymous user account
 * Generates a random username and creates a session
 */
export async function createAnonymousUser(): Promise<CreateAnonymousUserResult> {
  // Generate unique username
  const username = await generateUniqueUsername();

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      email: null,
      emailVerified: false,
      passwordHash: null,
      role: 'PUBLIC',
      status: 'ACTIVE',
    },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
    },
  });

  // Generate JWT token
  const { token, jti, expiresAt } = generateToken({
    userId: user.id,
    username: user.username,
    emailVerified: user.emailVerified,
  });

  // Create session
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashJti(jti),
      expiresAt,
    },
  });

  // Generate CSRF token
  const csrfToken = generateCsrfToken();

  return {
    user,
    token,
    csrfToken,
    expiresAt,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      photo: true,
      about: true,
      createdAt: true,
    },
  });
}

/**
 * Verify session exists and is valid
 */
export async function verifySession(userId: number, jti: string): Promise<boolean> {
  const tokenHash = hashJti(jti);

  const session = await prisma.session.findFirst({
    where: {
      userId,
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  return !!session;
}

/**
 * Delete session (logout)
 */
export async function deleteSession(userId: number, jti: string): Promise<void> {
  const tokenHash = hashJti(jti);

  await prisma.session.deleteMany({
    where: {
      userId,
      tokenHash,
    },
  });
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: number): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      userId,
    },
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Upgrade anonymous user with email
 */
export async function upgradeUserWithEmail(
  userId: number,
  email: string
): Promise<{ success: boolean; message: string }> {
  // Check if email already exists
  const existing = await prisma.user.findFirst({
    where: {
      email,
      id: {
        not: userId,
      },
    },
  });

  if (existing) {
    return {
      success: false,
      message: 'Email already in use',
    };
  }

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      // emailVerified will be set to true after email verification (Task 202)
    },
  });

  return {
    success: true,
    message: `Email added to account`,
  };
}

/**
 * Create magic link for user authentication
 * Finds or creates user, generates code, and sends email
 */
export async function createMagicLink(
  email: string,
  returnUrl?: string,
  ipAddress?: string
): Promise<void> {
  // Find or create user by email
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    // Create new user with email
    const username = await generateUniqueUsername();
    user = await prisma.user.create({
      data: {
        username,
        email,
        emailVerified: false,
        passwordHash: null,
        role: 'PUBLIC',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
  }

  // Invalidate old magic links for this user
  await invalidateUnusedMagicLinks(user.id);

  // Generate unique code
  const code = await generateUniqueMagicLinkCode();
  const expiresAt = getMagicLinkExpiry();

  // Create magic link record
  await prisma.magicLink.create({
    data: {
      userId: user.id,
      code,
      email,
      expiresAt,
      ipAddress,
    },
  });

  // Send magic link email
  await sendMagicLinkEmail(email, code, returnUrl);
}

/**
 * Verify magic link code and create session
 */
export async function verifyMagicLink(code: string): Promise<CreateAnonymousUserResult | null> {
  // Find magic link by code
  const magicLink = await prisma.magicLink.findUnique({
    where: { code },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          emailVerified: true,
        },
      },
    },
  });

  if (!magicLink) {
    return null;
  }

  // Check if already used
  if (magicLink.usedAt) {
    return null;
  }

  // Check if expired
  if (isMagicLinkExpired(magicLink.expiresAt)) {
    return null;
  }

  // Mark as used
  await prisma.magicLink.update({
    where: { id: magicLink.id },
    data: { usedAt: new Date() },
  });

  // Update user's emailVerified if not already verified
  if (!magicLink.user.emailVerified && magicLink.email === magicLink.user.email) {
    await prisma.user.update({
      where: { id: magicLink.user.id },
      data: { emailVerified: true },
    });
  }

  // Generate JWT token
  const { token, jti, expiresAt } = generateToken({
    userId: magicLink.user.id,
    username: magicLink.user.username,
    emailVerified: true,
  });

  // Create session
  await prisma.session.create({
    data: {
      userId: magicLink.user.id,
      tokenHash: hashJti(jti),
      expiresAt,
    },
  });

  // Generate CSRF token
  const csrfToken = generateCsrfToken();

  return {
    user: {
      ...magicLink.user,
      emailVerified: true,
    },
    token,
    csrfToken,
    expiresAt,
  };
}

/**
 * Login with email and password
 */
export async function loginWithPassword(
  email: string,
  password: string
): Promise<CreateAnonymousUserResult | null> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      email: true,
      emailVerified: true,
      passwordHash: true,
    },
  });

  if (!user) {
    // Return null to prevent email enumeration
    return null;
  }

  // Check if password is set
  if (!user.passwordHash) {
    throw new Error('No password set, use magic link');
  }

  // Verify password
  const isValid = await verify(user.passwordHash, password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  if (!isValid) {
    return null;
  }

  // Generate JWT token
  const { token, jti, expiresAt } = generateToken({
    userId: user.id,
    username: user.username,
    emailVerified: user.emailVerified,
  });

  // Create session
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashJti(jti),
      expiresAt,
    },
  });

  // Generate CSRF token
  const csrfToken = generateCsrfToken();

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    token,
    csrfToken,
    expiresAt,
  };
}

/**
 * Set password for user (first time)
 */
export async function setUserPassword(userId: number, password: string): Promise<void> {
  // Hash password with argon2id
  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // Update user password
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      lastPasswordAt: new Date(),
    },
  });

  // Invalidate all other sessions (keep current session)
  // This is handled in the route by keeping the current session token
}

/**
 * Change user password (requires current password)
 */
export async function changeUserPassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Get user with password hash
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.passwordHash) {
    throw new Error('No password set');
  }

  // Verify current password
  const isValid = await verify(user.passwordHash, currentPassword, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  if (!isValid) {
    throw new Error('Invalid current password');
  }

  // Hash new password
  const passwordHash = await hash(newPassword, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      lastPasswordAt: new Date(),
    },
  });

  // Invalidate all sessions except current
  // This would need the current jti to exclude it, but for now we'll invalidate all
  await deleteAllUserSessions(userId);
}
