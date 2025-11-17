import express, { type Request, type Response } from 'express';
import type { Router } from 'express-serve-static-core';
import { requireAdminAuth, type AuthConfig } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import { createAuthRouter } from './auth';
import categoriesRouter from './categories';
import listingsRouter from './listings';
import addressesRouter from './addresses';
import directoriesRouter from './directories';

/**
 * Create admin routes with authentication
 */
export function createAdminRouter(config: AuthConfig): Router {
  const router = express.Router();
  const adminAuth = requireAdminAuth(config);

  // Auth routes (no auth required)
  router.use('/auth', createAuthRouter(config));

  // Protected admin routes
  router.use('/categories', adminRateLimiter, adminAuth, categoriesRouter);
  router.use('/listings', adminRateLimiter, adminAuth, listingsRouter);
  router.use('/addresses', adminRateLimiter, adminAuth, addressesRouter);
  router.use('/directories', adminRateLimiter, adminAuth, directoriesRouter);

  // Admin ping (protected)
  router.get('/ping', adminRateLimiter, adminAuth, (req: Request, res: Response) => {
    res.json({ status: 'admin-ok' });
  });

  return router;
}
