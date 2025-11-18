import { Router } from 'express';
import { publicRateLimiter } from '../../middleware/rateLimiter';
import directoriesRouter from './directories';

/**
 * Create public routes
 */
export function createPublicRouter() {
  const router = Router();

  router.use('/directories', publicRateLimiter, directoriesRouter);

  return router;
}
