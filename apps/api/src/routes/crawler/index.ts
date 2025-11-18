import { Router, Request, Response } from 'express';
import { requireCrawlerToken, type AuthConfig } from '../../middleware/auth';
import { crawlerRateLimiter } from '../../middleware/rateLimiter';
import listingsRouter from './listings';

/**
 * Create crawler routes with authentication
 */
export function createCrawlerRouter(config: AuthConfig) {
  const router = Router();
  const crawlerAuth = requireCrawlerToken(config);

  // All crawler routes require authentication
  router.use('/listings', crawlerRateLimiter, crawlerAuth, listingsRouter);

  // Crawler ping (protected)
  router.post('/ping', crawlerRateLimiter, crawlerAuth, (_req: Request, res: Response) => {
    res.json({ status: 'crawler-ok' });
  });

  return router;
}
