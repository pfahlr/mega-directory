import express from 'express';
import type { Router } from 'express-serve-static-core';
import directoriesRouter from './directories';

/**
 * Create public routes
 */
export function createPublicRouter(): Router {
  const router = express.Router();

  router.use('/directories', directoriesRouter);

  return router;
}
