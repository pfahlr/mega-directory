import * as express from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateBody } from '../../middleware/validation';
import { createCategorySchema, updateCategorySchema } from '../../validation/schemas/category';
import * as categoryService from '../../services/categoryService';

const router = express.Router();

/**
 * GET /v1/admin/categories
 * Get all categories (paginated)
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await categoryService.getAllCategories({ page, limit });
    res.json(result);
  })
);

/**
 * GET /v1/admin/categories/:id
 * Get category by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const category = await categoryService.getCategoryById(id);
    res.json({ data: category });
  })
);

/**
 * POST /v1/admin/categories
 * Create new category
 */
router.post(
  '/',
  validateBody(createCategorySchema),
  asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(req.body);
    res.status(201).json({ data: category });
  })
);

/**
 * PUT /v1/admin/categories/:id
 * Update category
 */
router.put(
  '/:id',
  validateBody(updateCategorySchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const category = await categoryService.updateCategory(id, req.body);
    res.json({ data: category });
  })
);

/**
 * DELETE /v1/admin/categories/:id
 * Delete category
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    await categoryService.deleteCategory(id);
    res.status(204).end();
  })
);

export default router;
