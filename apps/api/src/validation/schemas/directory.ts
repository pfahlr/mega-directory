import { z } from 'zod';

/**
 * Schema for creating a new directory
 */
export const createDirectorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(80),
  subdomain: z.string()
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens')
    .max(63)
    .optional()
    .nullable(),
  subdirectory: z.string()
    .regex(/^[a-z0-9-/]+$/, 'Subdirectory must be lowercase alphanumeric with hyphens and slashes')
    .max(100)
    .optional()
    .nullable(),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.number().int().positive('Category ID must be a positive integer'),
  cityId: z.number().int().positive('City ID must be a positive integer'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], {
    message: 'Status must be DRAFT, PUBLISHED, or ARCHIVED'
  }).optional().default('DRAFT')
});

/**
 * Schema for updating an existing directory
 */
export const updateDirectorySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(80)
    .optional(),
  subdomain: z.string()
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens')
    .max(63)
    .optional()
    .nullable(),
  subdirectory: z.string()
    .regex(/^[a-z0-9-/]+$/, 'Subdirectory must be lowercase alphanumeric with hyphens and slashes')
    .max(100)
    .optional()
    .nullable(),
  description: z.string().max(1000).optional().nullable(),
  categoryId: z.number().int().positive('Category ID must be a positive integer').optional(),
  cityId: z.number().int().positive('City ID must be a positive integer').optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional()
});

/**
 * Schema for directory ID parameter
 */
export const directoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

/**
 * Schema for directory slug parameter
 */
export const directorySlugParamSchema = z.object({
  slug: z.string().min(1).max(80)
});

/**
 * Schema for directory query parameters
 */
export const directoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional()
});

// Export inferred types
export type CreateDirectoryDto = z.infer<typeof createDirectorySchema>;
export type UpdateDirectoryDto = z.infer<typeof updateDirectorySchema>;
export type DirectoryIdParam = z.infer<typeof directoryIdParamSchema>;
export type DirectorySlugParam = z.infer<typeof directorySlugParamSchema>;
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;
