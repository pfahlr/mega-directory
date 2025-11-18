import express = require('express');
import { Request, Response } from 'express';
import { requireAdminAuth, type AuthConfig } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import { createAuthRouter } from './auth';
import categoriesRouter from './categories';
import listingsRouter from './listings';
import addressesRouter from './addresses';
import directoriesRouter from './directories';
import reportsRouter from './reports';
import reviewsRouter from './reviews';

/**
 * Create admin routes with authentication
 */
export function createAdminRouter(config: AuthConfig) {
  const router = express.Router();
  const adminAuth = requireAdminAuth(config);

  // Auth routes (no auth required)
  router.use('/auth', createAuthRouter(config));

  // Protected admin routes
  router.use('/categories', adminRateLimiter, adminAuth, categoriesRouter);
  router.use('/listings', adminRateLimiter, adminAuth, listingsRouter);
  router.use('/addresses', adminRateLimiter, adminAuth, addressesRouter);
  router.use('/directories', adminRateLimiter, adminAuth, directoriesRouter);
  router.use('/reports', adminRateLimiter, adminAuth, reportsRouter);
  router.use('/reviews', adminRateLimiter, adminAuth, reviewsRouter);

  // Admin ping (protected)
  router.get('/ping', adminRateLimiter, adminAuth, (_req: Request, res: Response) => {
    res.json({ status: 'admin-ok' });
  });

  return router;
}
