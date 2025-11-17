import { describe, it, expect, beforeEach } from 'vitest';
import { getListingsWithRelations, getDirectoriesWithData, createListingWithAddress } from '../../src/db';
import { getTestPrisma, clearTestData } from '../helpers/database';
import { createTestListing, createTestDirectory, createApprovedListing, linkListingToDirectory } from '../helpers/factories';

describe('Database Helpers', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  describe('getListingsWithRelations', () => {
    it('should return listings with all relations', async () => {
      const listing = await createApprovedListing({
        title: 'Test Restaurant',
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

      const listings = await getListingsWithRelations();

      expect(listings).toHaveLength(1);
      expect(listings[0].id).toBe(listing.id);
      expect(listings[0].title).toBe('Test Restaurant');
      expect(listings[0].addresses).toHaveLength(1);
      expect(listings[0].addresses[0].addressLine1).toBe('123 Main St');
    });

    it('should filter listings by status', async () => {
      await createApprovedListing({ title: 'Approved Business' });
      await createTestListing({ title: 'Pending Business', status: 'PENDING' });
      await createTestListing({ title: 'Rejected Business', status: 'REJECTED' });

      const approvedListings = await getListingsWithRelations({ status: 'APPROVED' });
      const pendingListings = await getListingsWithRelations({ status: 'PENDING' });

      expect(approvedListings).toHaveLength(1);
      expect(approvedListings[0].title).toBe('Approved Business');
      expect(approvedListings[0].status).toBe('APPROVED');

      expect(pendingListings).toHaveLength(1);
      expect(pendingListings[0].title).toBe('Pending Business');
      expect(pendingListings[0].status).toBe('PENDING');
    });

    it('should filter listings by directoryId', async () => {
      const directory = await createTestDirectory();
      const listing1 = await createApprovedListing({ title: 'In Directory' });
      const listing2 = await createApprovedListing({ title: 'Not In Directory' });

      await linkListingToDirectory(listing1.id, directory.id);

      const directoryListings = await getListingsWithRelations({ directoryId: directory.id });

      expect(directoryListings).toHaveLength(1);
      expect(directoryListings[0].title).toBe('In Directory');
    });

    it('should return empty array when no listings exist', async () => {
      const prisma = getTestPrisma();
      await prisma.listing.deleteMany({});

      const listings = await getListingsWithRelations();

      expect(listings).toHaveLength(0);
    });
  });

  describe('getDirectoriesWithData', () => {
    it('should return directories with nested location data', async () => {
      const directories = await getDirectoriesWithData();

      expect(directories.length).toBeGreaterThan(0);
      const directory = directories[0];

      expect(directory.title).toBeDefined();
      expect(directory.category).toBeDefined();
      expect(directory.category.name).toBeDefined();
      expect(directory.location).toBeDefined();
    });

    it('should include approved listings in directories', async () => {
      const directory = await createTestDirectory();
      const approvedListing = await createApprovedListing({ title: 'Approved' });
      const pendingListing = await createTestListing({ title: 'Pending', status: 'PENDING' });

      await linkListingToDirectory(approvedListing.id, directory.id);
      await linkListingToDirectory(pendingListing.id, directory.id);

      const directories = await getDirectoriesWithData();
      const testDirectory = directories.find(d => d.id === directory.id);

      expect(testDirectory).toBeDefined();
      expect(testDirectory!.listings).toHaveLength(1);
      expect(testDirectory!.listings[0].title).toBe('Approved');
      expect(testDirectory!.listings[0].status).toBe('APPROVED');
    });

    it('should only return ACTIVE directories', async () => {
      const prisma = getTestPrisma();
      const category = await prisma.category.findFirst();
      const city = await prisma.city.findFirst();

      // Create an inactive directory
      const inactiveDirectory = await prisma.directory.create({
        data: {
          title: 'Inactive Directory',
          slug: 'inactive-dir',
          subdomain: 'inactive',
          subdirectory: null,
          status: 'INACTIVE',
          categoryId: category!.id,
          cityId: city!.id,
          location: {
            create: {
              cityId: city!.id
            }
          }
        }
      });

      const directories = await getDirectoriesWithData();

      expect(directories.every(d => d.status === 'ACTIVE')).toBe(true);
      expect(directories.find(d => d.id === inactiveDirectory.id)).toBeUndefined();
    });
  });

  describe('createListingWithAddress', () => {
    it('should create listing with single address', async () => {
      const listing = await createListingWithAddress({
        title: 'New Business',
        slug: 'new-business',
        websiteUrl: 'https://newbusiness.com',
        summary: 'A new business',
        addresses: [
          {
            addressLine1: '456 Market St',
            city: 'San Francisco',
            region: 'CA',
            postalCode: '94102',
            country: 'US'
          }
        ]
      });

      expect(listing.id).toBeDefined();
      expect(listing.title).toBe('New Business');
      expect(listing.slug).toBe('new-business');
      expect(listing.addresses).toHaveLength(1);
      expect(listing.addresses[0].addressLine1).toBe('456 Market St');
      expect(listing.addresses[0].city).toBe('San Francisco');
    });

    it('should create listing with multiple addresses', async () => {
      const listing = await createListingWithAddress({
        title: 'Multi-Location Business',
        slug: 'multi-location',
        addresses: [
          {
            addressLine1: '100 First St',
            city: 'San Francisco',
            region: 'CA',
            country: 'US'
          },
          {
            addressLine1: '200 Second St',
            city: 'Oakland',
            region: 'CA',
            country: 'US'
          }
        ]
      });

      expect(listing.addresses).toHaveLength(2);
      expect(listing.addresses[0].addressLine1).toBe('100 First St');
      expect(listing.addresses[1].addressLine1).toBe('200 Second St');
    });

    it('should create listing with default PENDING status', async () => {
      const listing = await createListingWithAddress({
        title: 'Default Status Business',
        slug: 'default-status',
        addresses: [
          {
            addressLine1: '789 Test Ave',
            city: 'Test City',
            region: 'TC',
            country: 'US'
          }
        ]
      });

      expect(listing.status).toBe('PENDING');
    });

    it('should create listing with specified status', async () => {
      const listing = await createListingWithAddress({
        title: 'Approved Business',
        slug: 'approved-business',
        status: 'APPROVED',
        addresses: [
          {
            addressLine1: '789 Test Ave',
            city: 'Test City',
            region: 'TC',
            country: 'US'
          }
        ]
      });

      expect(listing.status).toBe('APPROVED');
    });

    it('should handle optional address fields', async () => {
      const listing = await createListingWithAddress({
        title: 'Minimal Address Business',
        slug: 'minimal-address',
        addresses: [
          {
            addressLine1: '999 Minimal St'
          }
        ]
      });

      expect(listing.addresses[0].addressLine1).toBe('999 Minimal St');
      expect(listing.addresses[0].city).toBeNull();
      expect(listing.addresses[0].region).toBeNull();
      expect(listing.addresses[0].postalCode).toBeNull();
      expect(listing.addresses[0].country).toBeNull();
    });
  });
});
