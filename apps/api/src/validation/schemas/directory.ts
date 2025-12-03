import { z } from 'zod';

/**
 * Schema for creating a new directory
 */
const directoryStatusEnum = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);

const baseDirectoryFields = {
  title: z.string().min(1, 'Title is required').max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(80),
  subdomain: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(63),
  subdirectory: z
    .string()
    .regex(/^[a-z0-9-/]+$/, 'Subdirectory must be lowercase alphanumeric with hyphens and slashes')
    .min(1)
    .max(100),
  categoryId: z.number().int().positive('Category ID must be a positive integer'),
  locationId: z.number().int().positive('Location ID must be a positive integer').optional().nullable(),
  locationAgnostic: z.coerce.boolean().optional().default(false),
  heroTitle: z.string().max(200).optional().nullable(),
  heroSubtitle: z.string().max(300).optional().nullable(),
  introMarkdown: z.string().max(5000).optional().nullable(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  metaKeywords: z.string().max(500).optional().nullable(),
  ogImageUrl: z.string().url('ogImageUrl must be a valid URL').optional().nullable(),
  featuredLimit: z.number().int().positive().max(50).optional(),
  status: directoryStatusEnum.optional().default('DRAFT')
};

export const createDirectorySchema = z.object(baseDirectoryFields);

/**
 * Schema for updating an existing directory
 */
export const updateDirectorySchema = z.object({
  ...Object.fromEntries(
    Object.entries(baseDirectoryFields).map(([key, schema]) => [
      key,
      // For updates every field is optional but should keep the same validation rules.
      (schema as z.ZodTypeAny).optional()
    ])
  ),
  subdomain: (baseDirectoryFields.subdomain as z.ZodTypeAny).optional(),
  subdirectory: (baseDirectoryFields.subdirectory as z.ZodTypeAny).optional()
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
