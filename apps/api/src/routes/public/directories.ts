import * as express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as directoryService from '../../services/directoryService';

const router = express.Router();

/**
 * GET /v1/directories
 * Get all active directories
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const directories = await directoryService.getActiveDirectories();
    res.json({ data: directories });
  })
);

/**
 * GET /v1/directories/:slug
 * Get directory by slug with listings
 */
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const directory = await directoryService.getDirectoryBySlug(slug);
    res.json({ data: directory });
  })
);

export default router;
