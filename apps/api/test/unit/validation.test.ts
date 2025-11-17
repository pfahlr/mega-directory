import { describe, it, expect } from 'vitest';
import {
  createListingSchema,
  updateListingSchema,
  listingQuerySchema,
  addressSchema,
  crawlerListingSchema
} from '../../src/validation/schemas/listing';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema
} from '../../src/validation/schemas/category';
import {
  createDirectorySchema,
  updateDirectorySchema,
  directoryQuerySchema
} from '../../src/validation/schemas/directory';

describe('Validation Schemas', () => {
  describe('Listing Validation', () => {
    describe('createListingSchema', () => {
      it('should validate a valid listing', () => {
        const validListing = {
          title: 'Test Business',
          slug: 'test-business',
          addresses: [
            {
              addressLine1: '123 Main St',
              city: 'San Francisco',
              region: 'CA',
              country: 'US'
            }
          ]
        };

        const result = createListingSchema.safeParse(validListing);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('PENDING'); // Default value
          expect(result.data.categoryIds).toEqual([]); // Default value
        }
      });

      it('should reject listing with invalid slug', () => {
        const invalidListing = {
          title: 'Test Business',
          slug: 'Test Business!', // Invalid: uppercase and special chars
          addresses: [
            {
              addressLine1: '123 Main St',
              city: 'San Francisco',
              region: 'CA',
              country: 'US'
            }
          ]
        };

        const result = createListingSchema.safeParse(invalidListing);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('slug');
        }
      });

      it('should reject listing without addresses', () => {
        const invalidListing = {
          title: 'Test Business',
          slug: 'test-business',
          addresses: []
        };

        const result = createListingSchema.safeParse(invalidListing);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('addresses');
        }
      });

      it('should reject listing with too many addresses', () => {
        const addresses = Array(11).fill({
          addressLine1: '123 Main St',
          city: 'San Francisco',
          region: 'CA',
          country: 'US'
        });

        const invalidListing = {
          title: 'Test Business',
          slug: 'test-business',
          addresses
        };

        const result = createListingSchema.safeParse(invalidListing);
        expect(result.success).toBe(false);
      });

      it('should validate listing with optional fields', () => {
        const listing = {
          title: 'Test Business',
          slug: 'test-business',
          websiteUrl: 'https://example.com',
          contactEmail: 'contact@example.com',
          contactPhone: '555-1234',
          summary: 'A great business',
          description: 'Detailed description',
          status: 'APPROVED',
          addresses: [
            {
              addressLine1: '123 Main St',
              addressLine2: 'Suite 100',
              city: 'San Francisco',
              region: 'CA',
              postalCode: '94102',
              country: 'US',
              latitude: 37.7749,
              longitude: -122.4194,
              isPrimary: true
            }
          ],
          categoryIds: [1, 2, 3],
          directoryId: 1
        };

        const result = createListingSchema.safeParse(listing);
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const listing = {
          title: 'Test Business',
          slug: 'test-business',
          contactEmail: 'not-an-email',
          addresses: [
            {
              addressLine1: '123 Main St',
              city: 'San Francisco',
              region: 'CA',
              country: 'US'
            }
          ]
        };

        const result = createListingSchema.safeParse(listing);
        expect(result.success).toBe(false);
      });

      it('should reject invalid URL', () => {
        const listing = {
          title: 'Test Business',
          slug: 'test-business',
          websiteUrl: 'not-a-url',
          addresses: [
            {
              addressLine1: '123 Main St',
              city: 'San Francisco',
              region: 'CA',
              country: 'US'
            }
          ]
        };

        const result = createListingSchema.safeParse(listing);
        expect(result.success).toBe(false);
      });
    });

    describe('addressSchema', () => {
      it('should validate a complete address', () => {
        const address = {
          addressLine1: '123 Main St',
          addressLine2: 'Suite 100',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94102',
          country: 'US',
          latitude: 37.7749,
          longitude: -122.4194,
          isPrimary: true
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(true);
      });

      it('should validate a minimal address', () => {
        const address = {
          addressLine1: '123 Main St',
          city: 'San Francisco',
          region: 'CA',
          country: 'US'
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(true);
      });

      it('should reject invalid country code', () => {
        const address = {
          addressLine1: '123 Main St',
          city: 'San Francisco',
          region: 'CA',
          country: 'USA' // Should be 2 letters
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(false);
      });

      it('should reject invalid coordinates', () => {
        const address = {
          addressLine1: '123 Main St',
          city: 'San Francisco',
          region: 'CA',
          country: 'US',
          latitude: 91, // Invalid: > 90
          longitude: -200 // Invalid: < -180
        };

        const result = addressSchema.safeParse(address);
        expect(result.success).toBe(false);
      });
    });

    describe('listingQuerySchema', () => {
      it('should apply default values', () => {
        const result = listingQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
        }
      });

      it('should coerce string numbers to numbers', () => {
        const query = {
          page: '2',
          limit: '50',
          categoryId: '5'
        };

        const result = listingQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(2);
          expect(result.data.limit).toBe(50);
          expect(result.data.categoryId).toBe(5);
        }
      });

      it('should reject limit > 100', () => {
        const query = { limit: '150' };
        const result = listingQuerySchema.safeParse(query);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Category Validation', () => {
    describe('createCategorySchema', () => {
      it('should validate a valid category', () => {
        const category = {
          name: 'Restaurants',
          slug: 'restaurants',
          description: 'Food and dining establishments'
        };

        const result = createCategorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });

      it('should validate without description', () => {
        const category = {
          name: 'Restaurants',
          slug: 'restaurants'
        };

        const result = createCategorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });

      it('should reject invalid slug', () => {
        const category = {
          name: 'Restaurants',
          slug: 'Restaurants!' // Invalid
        };

        const result = createCategorySchema.safeParse(category);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Directory Validation', () => {
    describe('createDirectorySchema', () => {
      it('should validate a valid directory', () => {
        const directory = {
          title: 'SF Restaurants',
          slug: 'sf-restaurants',
          subdomain: 'sf',
          categoryId: 1,
          cityId: 1
        };

        const result = createDirectorySchema.safeParse(directory);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('DRAFT'); // Default
        }
      });

      it('should validate with subdirectory', () => {
        const directory = {
          title: 'SF Restaurants',
          slug: 'sf-restaurants',
          subdirectory: 'california/san-francisco',
          categoryId: 1,
          cityId: 1
        };

        const result = createDirectorySchema.safeParse(directory);
        expect(result.success).toBe(true);
      });

      it('should reject invalid subdomain', () => {
        const directory = {
          title: 'SF Restaurants',
          slug: 'sf-restaurants',
          subdomain: 'SF_Restaurants', // Invalid: underscore and uppercase
          categoryId: 1,
          cityId: 1
        };

        const result = createDirectorySchema.safeParse(directory);
        expect(result.success).toBe(false);
      });

      it('should require categoryId and cityId', () => {
        const directory = {
          title: 'SF Restaurants',
          slug: 'sf-restaurants'
        };

        const result = createDirectorySchema.safeParse(directory);
        expect(result.success).toBe(false);
      });
    });

    describe('directoryQuerySchema', () => {
      it('should filter by status', () => {
        const query = {
          status: 'PUBLISHED',
          page: '1'
        };

        const result = directoryQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('PUBLISHED');
        }
      });
    });
  });

  describe('Crawler Listing Schema', () => {
    it('should validate crawler submission', () => {
      const crawlerListing = {
        title: 'Business from Crawler',
        websiteUrl: 'https://example.com',
        summary: 'Discovered by crawler',
        addresses: [
          {
            addressLine1: '123 Main St',
            city: 'San Francisco',
            region: 'CA',
            country: 'US'
          }
        ]
      };

      const result = crawlerListingSchema.safeParse(crawlerListing);
      expect(result.success).toBe(true);
    });

    it('should validate crawler submission with minimal data', () => {
      const crawlerListing = {
        title: 'Business from Crawler',
        addresses: [
          {
            addressLine1: '123 Main St'
          }
        ]
      };

      const result = crawlerListingSchema.safeParse(crawlerListing);
      expect(result.success).toBe(true);
    });
  });
});
