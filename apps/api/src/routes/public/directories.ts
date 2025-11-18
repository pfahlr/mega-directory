import { Router } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as directoryService from '../../services/directoryService';

const router = Router();

/**
 * GET /v1/directories
 * Get all active directories (paginated)
 * @openapi
 * /v1/directories:
 *   get:
 *     tags:
 *       - Public
 *     summary: Get all active directories
 *     description: Retrieve all published directories for public browsing
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Directory'
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
 * @openapi
 * /v1/directories/{slug}:
 *   get:
 *     tags:
 *       - Public
 *     summary: Get directory by slug
 *     description: Retrieve a directory by its slug with all associated listings
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Directory slug
 *         example: nyc-professional-services
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Directory'
 *       404:
 *         description: Directory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
