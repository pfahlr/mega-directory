import express = require('express');
import { publicRateLimiter } from '../../middleware/rateLimiter';
import directoriesRouter from './directories';
import authRouter from './auth';
import listsRouter from './lists';
import votesRouter from './votes';
import reportsRouter from './reports';
import reviewsRouter from './reviews';

/**
 * Create public routes
 */
export function createPublicRouter() {
  const router = express.Router();

  router.use('/auth', publicRateLimiter, authRouter);
  router.use('/directories', publicRateLimiter, directoriesRouter);
  router.use('/lists', publicRateLimiter, listsRouter);
  router.use('/votes', publicRateLimiter, votesRouter);
  router.use('/reports', publicRateLimiter, reportsRouter);
  router.use('/reviews', publicRateLimiter, reviewsRouter);

  return router;
}
