import { describe, it, expect, beforeEach } from 'vitest';
import { clearTestData, getTestPrisma } from '../helpers/database';
import { createTestListing, createApprovedListing, createPendingListing } from '../helpers/factories';

describe('Listings CRUD Operations', () => {
  let prisma: ReturnType<typeof getTestPrisma>;

  beforeEach(async () => {
    await clearTestData();
    prisma = getTestPrisma();
  });

  describe('Create Listing', () => {
    it('should create listing with addresses', async () => {
      const listing = await createTestListing({
        title: 'New Restaurant',
        slug: 'new-restaurant',
        description: 'A great new restaurant',
        addresses: [
          {
            addressLine1: '123 Main St',
            city: 'San Francisco',
            region: 'CA',
            country: 'US',
            isPrimary: true
          }
        ]
      });

      expect(listing.id).toBeDefined();
      expect(listing.title).toBe('New Restaurant');
      expect(listing.addresses).toHaveLength(1);
      expect(listing.addresses[0].addressLine1).toBe('123 Main St');
      expect(listing.addresses[0].isPrimary).toBe(true);
    });

    it('should create listing with multiple addresses', async () => {
      const listing = await createTestListing({
        title: 'Multi-Location Business',
        addresses: [
          {
            addressLine1: '100 First St',
            city: 'San Francisco',
            region: 'CA',
            country: 'US',
            isPrimary: true
          },
          {
            addressLine1: '200 Second St',
            city: 'Oakland',
            region: 'CA',
            country: 'US',
            isPrimary: false
          }
        ]
      });

      expect(listing.addresses).toHaveLength(2);
      expect(listing.addresses.filter(a => a.isPrimary)).toHaveLength(1);
    });

    it('should default to PENDING status', async () => {
      const listing = await createTestListing({
        title: 'Pending Business'
      });

      expect(listing.status).toBe('PENDING');
    });
  });

  describe('Read Listing', () => {
    it('should retrieve listing by id', async () => {
      const created = await createTestListing({ title: 'Test Business' });

      const retrieved = await prisma.listing.findUnique({
        where: { id: created.id },
        include: { addresses: true }
      });

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Test Business');
    });

    it('should return null for non-existent listing', async () => {
      const retrieved = await prisma.listing.findUnique({
        where: { id: 99999 }
      });

      expect(retrieved).toBeNull();
    });

    it('should include addresses in listing query', async () => {
      const created = await createTestListing({
        title: 'Business with Address',
        addresses: [
          {
            addressLine1: '456 Test Ave',
            city: 'Test City',
            region: 'TC',
            country: 'US',
            isPrimary: true
          }
        ]
      });

      const retrieved = await prisma.listing.findUnique({
        where: { id: created.id },
        include: { addresses: true }
      });

      expect(retrieved!.addresses).toHaveLength(1);
      expect(retrieved!.addresses[0].addressLine1).toBe('456 Test Ave');
    });
  });

  describe('Update Listing', () => {
    it('should update listing status', async () => {
      const listing = await createPendingListing({ title: 'Pending Business' });

      const updated = await prisma.listing.update({
        where: { id: listing.id },
        data: { status: 'APPROVED' }
      });

      expect(updated.status).toBe('APPROVED');
    });

    it('should update listing title', async () => {
      const listing = await createTestListing({ title: 'Old Title' });

      const updated = await prisma.listing.update({
        where: { id: listing.id },
        data: { title: 'New Title' }
      });

      expect(updated.title).toBe('New Title');
    });

    it('should update listing description', async () => {
      const listing = await createTestListing({
        title: 'Test',
        description: 'Old description'
      });

      const updated = await prisma.listing.update({
        where: { id: listing.id },
        data: { description: 'New description' }
      });

      expect(updated.description).toBe('New description');
    });
  });

  describe('Delete Listing', () => {
    it('should delete listing', async () => {
      const listing = await createTestListing({ title: 'To Delete' });

      await prisma.listing.delete({
        where: { id: listing.id }
      });

      const retrieved = await prisma.listing.findUnique({
        where: { id: listing.id }
      });

      expect(retrieved).toBeNull();
    });

    it('should cascade delete addresses when listing is deleted', async () => {
      const listing = await createTestListing({
        title: 'Cascade Test',
        addresses: [
          {
            addressLine1: '123 Delete St',
            city: 'Delete City',
            region: 'DC',
            country: 'US',
            isPrimary: true
          }
        ]
      });

      const addressId = listing.addresses[0].id;

      await prisma.listing.delete({
        where: { id: listing.id }
      });

      const address = await prisma.listingAddress.findUnique({
        where: { id: addressId }
      });

      expect(address).toBeNull();
    });

    it('should handle deleting non-existent listing', async () => {
      await expect(
        prisma.listing.delete({
          where: { id: 99999 }
        })
      ).rejects.toThrow();
    });
  });

  describe('Query Listings', () => {
    it('should filter listings by status', async () => {
      await createApprovedListing({ title: 'Approved 1' });
      await createApprovedListing({ title: 'Approved 2' });
      await createPendingListing({ title: 'Pending 1' });

      const approved = await prisma.listing.findMany({
        where: { status: 'APPROVED' }
      });

      const pending = await prisma.listing.findMany({
        where: { status: 'PENDING' }
      });

      expect(approved).toHaveLength(2);
      expect(pending).toHaveLength(1);
    });

    it('should order listings by creation date', async () => {
      const first = await createTestListing({ title: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const second = await createTestListing({ title: 'Second' });

      const listings = await prisma.listing.findMany({
        orderBy: { createdAt: 'asc' }
      });

      expect(listings[0].id).toBe(first.id);
      expect(listings[1].id).toBe(second.id);
    });

    it('should search listings by title', async () => {
      await createTestListing({ title: 'Pizza Place' });
      await createTestListing({ title: 'Burger Joint' });
      await createTestListing({ title: 'Pizza Palace' });

      const pizzaListings = await prisma.listing.findMany({
        where: {
          title: {
            contains: 'Pizza',
            mode: 'insensitive'
          }
        }
      });

      expect(pizzaListings).toHaveLength(2);
    });
  });

  describe('Listing with Categories', () => {
    it('should create listing with categories', async () => {
      const category = await prisma.category.findFirst();

      const listing = await prisma.listing.create({
        data: {
          title: 'Categorized Business',
          slug: `categorized-${Date.now()}`,
          status: 'PENDING',
          addresses: {
            create: [
              {
                addressLine1: '789 Category St',
                city: 'Test',
                region: 'T',
                country: 'US',
                isPrimary: true
              }
            ]
          },
          categories: {
            create: [
              {
                categoryId: category!.id
              }
            ]
          }
        },
        include: {
          categories: {
            include: {
              category: true
            }
          }
        }
      });

      expect(listing.categories).toHaveLength(1);
      expect(listing.categories[0].category.id).toBe(category!.id);
    });
  });
});
