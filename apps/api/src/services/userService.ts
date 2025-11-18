/**
 * User service for authentication and user management
 */
import { prisma } from '../db';
import { generateToken, hashJti, generateCsrfToken } from '../utils/jwt';
import { generateUniqueUsername } from '../utils/usernameGenerator';

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
