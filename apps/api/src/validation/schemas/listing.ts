import { z } from 'zod';

/**
 * Address schema for listing addresses
 */
export const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required').max(200),
  addressLine2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, 'City is required').max(100),
  region: z.string().min(2, 'Region must be at least 2 characters').max(3),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().length(2, 'Country must be 2-letter ISO code'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isPrimary: z.boolean().optional().default(false)
});

/**
 * Schema for creating a new listing
 */
export const createListingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(80),
  websiteUrl: z.string().url('Invalid website URL').optional().nullable(),
  contactEmail: z.string().email('Invalid email address').optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'], {
    message: 'Status must be PENDING, APPROVED, or REJECTED'
  }).optional().default('PENDING'),
  addresses: z.array(addressSchema)
    .min(1, 'At least one address is required')
    .max(10, 'Maximum 10 addresses allowed'),
  categoryIds: z.array(z.number().int().positive())
    .optional()
    .default([]),
  directoryId: z.number().int().positive().optional().nullable()
});

/**
 * Schema for updating an existing listing
 */
export const updateListingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  slug: z.string()
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .min(1)
    .max(80)
    .optional(),
  websiteUrl: z.string().url('Invalid website URL').optional().nullable(),
  contactEmail: z.string().email('Invalid email address').optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  addresses: z.array(addressSchema)
    .min(1, 'At least one address is required')
    .max(10, 'Maximum 10 addresses allowed')
    .optional(),
  categoryIds: z.array(z.number().int().positive()).optional(),
  directoryId: z.number().int().positive().optional().nullable()
});

/**
 * Schema for listing query parameters
 */
export const listingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  directoryId: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional()
});

/**
 * Schema for listing ID parameter
 */
export const listingIdParamSchema = z.object({
  listingId: z.coerce.number().int().positive()
});

/**
 * Schema for bulk listing review
 */
export const bulkReviewSchema = z.object({
  listingIds: z.array(z.number().int().positive())
    .min(1, 'At least one listing ID is required')
    .max(100, 'Maximum 100 listings can be reviewed at once'),
  action: z.enum(['APPROVE', 'REJECT'], {
    message: 'Action must be APPROVE or REJECT'
  })
});

/**
 * Schema for crawler listing submission
 */
export const crawlerListingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  websiteUrl: z.string().url('Invalid website URL').optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
  addresses: z.array(z.object({
    addressLine1: z.string().min(1).max(200),
    addressLine2: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    region: z.string().max(3).optional().nullable(),
    postalCode: z.string().max(20).optional().nullable(),
    country: z.string().length(2).optional().nullable()
  })).min(1, 'At least one address is required')
});

// Export inferred types
export type AddressDto = z.infer<typeof addressSchema>;
export type CreateListingDto = z.infer<typeof createListingSchema>;
export type UpdateListingDto = z.infer<typeof updateListingSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
export type ListingIdParam = z.infer<typeof listingIdParamSchema>;
export type BulkReviewDto = z.infer<typeof bulkReviewSchema>;
export type CrawlerListingDto = z.infer<typeof crawlerListingSchema>;
