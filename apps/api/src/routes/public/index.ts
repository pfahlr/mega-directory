import express = require('express');
import { publicRateLimiter } from '../../middleware/rateLimiter';
import directoriesRouter from './directories';
import authRouter from './auth';
import listsRouter from './lists';

/**
 * Create public routes
 */
export function createPublicRouter() {
  const router = express.Router();

  router.use('/auth', publicRateLimiter, authRouter);
  router.use('/directories', publicRateLimiter, directoriesRouter);
  router.use('/lists', publicRateLimiter, listsRouter);

  return router;
}
