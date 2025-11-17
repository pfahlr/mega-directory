import * as express from 'express';
import { requireAdminAuth, type AuthConfig } from '../../middleware/auth';
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
  router.use('/categories', adminAuth, categoriesRouter);
  router.use('/listings', adminAuth, listingsRouter);
  router.use('/addresses', adminAuth, addressesRouter);
  router.use('/directories', adminAuth, directoriesRouter);

  // Admin ping (protected)
  router.get('/ping', adminAuth, (req, res) => {
    res.json({ status: 'admin-ok' });
  });

  return router;
}
