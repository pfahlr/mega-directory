import express, { type Request, type Response } from 'express';
import type { Router } from 'express-serve-static-core';
import { requireCrawlerToken, type AuthConfig } from '../../middleware/auth';
import { crawlerRateLimiter } from '../../middleware/rateLimiter';
import listingsRouter from './listings';

/**
 * Create crawler routes with authentication
 */
export function createCrawlerRouter(config: AuthConfig): Router {
  const router = express.Router();
  const crawlerAuth = requireCrawlerToken(config);

  // All crawler routes require authentication
  router.use('/listings', crawlerRateLimiter, crawlerAuth, listingsRouter);

  // Crawler ping (protected)
  router.post('/ping', crawlerRateLimiter, crawlerAuth, (req: Request, res: Response) => {
    res.json({ status: 'crawler-ok' });
  });

  return router;
}
