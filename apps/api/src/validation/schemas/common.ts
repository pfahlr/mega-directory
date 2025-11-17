import { z } from 'zod';

/**
 * Reusable pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

/**
 * Generic search query schema
 */
export const searchQuerySchema = z.object({
  search: z.string().max(200).optional(),
  ...paginationSchema.shape
});

// Export inferred types
export type Pagination = z.infer<typeof paginationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
