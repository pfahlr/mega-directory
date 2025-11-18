import express = require('express');
import { publicRateLimiter } from '../../middleware/rateLimiter';
import directoriesRouter from './directories';
import authRouter from './auth';

/**
 * Create public routes
 */
export function createPublicRouter() {
  const router = express.Router();

  router.use('/auth', publicRateLimiter, authRouter);
  router.use('/directories', publicRateLimiter, directoriesRouter);

  return router;
}
