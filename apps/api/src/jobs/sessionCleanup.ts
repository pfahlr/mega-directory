/**
 * Session cleanup job
 * Removes expired sessions from the database
 */
import { cleanupExpiredSessions } from '../services/userService';
import { createLogger } from '../logger';

const logger = createLogger();

/**
 * Run session cleanup
 */
export async function runSessionCleanup(): Promise<void> {
  try {
    const deletedCount = await cleanupExpiredSessions();
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} expired sessions`);
    }
  } catch (error) {
    logger.error('Error cleaning up expired sessions', { error });
  }
}

/**
 * Start session cleanup job (runs daily)
 */
export function startSessionCleanup(): NodeJS.Timeout {
  // Run immediately on start
  runSessionCleanup();

  // Run every 24 hours
  const interval = setInterval(runSessionCleanup, 24 * 60 * 60 * 1000);

  logger.info('Session cleanup job started (runs daily)');

  return interval;
}
