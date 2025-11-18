/**
 * Magic link cleanup job
 * Periodically removes expired and old magic links from database
 */
import { prisma } from '../db';
import { createLogger } from '../logger';

const logger = createLogger({ name: 'magic-link-cleanup' });

/**
 * Delete expired magic links
 * Removes all magic links where expires_at is in the past
 * @returns Number of records deleted
 */
async function cleanupExpiredMagicLinks(): Promise<number> {
  const result = await prisma.magicLink.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Delete old unused magic links (older than 24 hours)
 * Removes magic links that were created more than 24 hours ago
 * This is an additional safety measure beyond expiration
 * @returns Number of records deleted
 */
async function cleanupOldMagicLinks(): Promise<number> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await prisma.magicLink.deleteMany({
    where: {
      createdAt: {
        lt: oneDayAgo,
      },
    },
  });

  return result.count;
}

/**
 * Run magic link cleanup
 * Deletes both expired and old magic links
 */
async function runMagicLinkCleanup(): Promise<void> {
  try {
    const [expiredCount, oldCount] = await Promise.all([
      cleanupExpiredMagicLinks(),
      cleanupOldMagicLinks(),
    ]);

    if (expiredCount > 0 || oldCount > 0) {
      logger.info(`Magic link cleanup completed: ${expiredCount} expired, ${oldCount} old links deleted`);
    }
  } catch (error) {
    logger.error({ error }, 'Magic link cleanup failed');
  }
}

/**
 * Start magic link cleanup job
 * Runs immediately and then every 5 minutes
 * @returns Interval handle that can be used to stop the job
 */
export function startMagicLinkCleanup(): NodeJS.Timeout {
  // Run immediately
  runMagicLinkCleanup();

  // Run every 5 minutes
  const interval = setInterval(runMagicLinkCleanup, 5 * 60 * 1000);

  logger.info('Magic link cleanup job started (runs every 5 minutes)');

  return interval;
}
