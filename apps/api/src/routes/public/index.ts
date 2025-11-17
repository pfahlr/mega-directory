import express, { type Router } from 'express';
import directoriesRouter from './directories';

/**
 * Create public routes
 */
export function createPublicRouter(): Router {
  const router = express.Router();

  router.use('/directories', directoriesRouter);

  return router;
}
