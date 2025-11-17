import * as express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as directoryService from '../../services/directoryService';

const router = express.Router();

/**
 * GET /v1/directories
 * Get all active directories (paginated)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await directoryService.getActiveDirectories({ page, limit });
    res.json(result);
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
