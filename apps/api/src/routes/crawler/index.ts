import express, { type Router, type Request, type Response } from 'express';
import { requireCrawlerToken, type AuthConfig } from '../../middleware/auth';
import listingsRouter from './listings';

/**
 * Create crawler routes with authentication
 */
export function createCrawlerRouter(config: AuthConfig): Router {
  const router = express.Router();
  const crawlerAuth = requireCrawlerToken(config);

  // All crawler routes require authentication
  router.use('/listings', crawlerAuth, listingsRouter);

  // Crawler ping (protected)
  router.post('/ping', crawlerAuth, (req: Request, res: Response) => {
    res.json({ status: 'crawler-ok' });
  });

  return router;
}
