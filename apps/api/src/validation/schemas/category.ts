import { z } from 'zod';

/**
 * Schema for creating a new category
 */
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(80),
  description: z.string().max(500).optional().nullable()
});

/**
 * Schema for updating an existing category
 */
export const updateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100).optional(),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(80)
    .optional(),
  description: z.string().max(500).optional().nullable()
});

/**
 * Schema for category ID parameter
 */
export const categoryIdParamSchema = z.object({
  categoryId: z.coerce.number().int().positive()
});

/**
 * Schema for category query parameters
 */
export const categoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(200).optional()
});

// Export inferred types
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CategoryIdParam = z.infer<typeof categoryIdParamSchema>;
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;
