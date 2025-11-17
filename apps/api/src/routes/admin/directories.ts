import * as express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validation';
import { createDirectorySchema, updateDirectorySchema } from '../../validation/schemas/directory';
import * as directoryService from '../../services/directoryService';

const router = express.Router();

/**
 * GET /v1/admin/directories
 * Get all directories (paginated)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await directoryService.getAllDirectories({ page, limit });
    res.json(result);
  })
);

/**
 * GET /v1/admin/directories/:id
 * Get directory by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const directory = await directoryService.getDirectoryById(id);
    res.json({ data: directory });
  })
);

/**
 * POST /v1/admin/directories
 * Create new directory
 */
router.post(
  '/',
  validateBody(createDirectorySchema),
  asyncHandler(async (req, res) => {
    const directory = await directoryService.createDirectory(req.body);
    res.status(201).json({ data: directory });
  })
);

/**
 * PUT /v1/admin/directories/:id
 * Update directory
 */
router.put(
  '/:id',
  validateBody(updateDirectorySchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const directory = await directoryService.updateDirectory(id, req.body);
    res.json({ data: directory });
  })
);

/**
 * DELETE /v1/admin/directories/:id
 * Delete directory
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await directoryService.deleteDirectory(id);
    res.status(204).end();
  })
);

export default router;
