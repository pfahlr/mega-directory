import { PrismaClient, Listing, ListingAddress, Directory, Category } from '@prisma/client';
import { getTestPrisma } from './database';

export interface CreateListingOptions {
  title?: string;
  slug?: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  addresses?: CreateAddressOptions[];
}

export interface CreateAddressOptions {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isPrimary?: boolean;
}

export async function createTestListing(
  options: CreateListingOptions = {}
): Promise<Listing & { addresses: ListingAddress[] }> {
  const prisma = getTestPrisma();

  const listing = await prisma.listing.create({
    data: {
      title: options.title || 'Test Business',
      slug: options.slug || `test-business-${Date.now()}`,
      description: options.description || 'A test business description',
      website: options.website || 'https://example.com',
      phone: options.phone || '555-1234',
      email: options.email || 'test@example.com',
      status: options.status || 'PENDING',
      addresses: {
        create: (options.addresses || [
          {
            addressLine1: '123 Test St',
            city: 'Test City',
            region: 'TC',
            country: 'US',
            isPrimary: true
          }
        ]).map(addr => ({
          addressLine1: addr.addressLine1,
          addressLine2: addr.addressLine2 || null,
          city: addr.city,
          region: addr.region,
          postalCode: addr.postalCode || null,
          country: addr.country,
          latitude: addr.latitude || null,
          longitude: addr.longitude || null,
          isPrimary: addr.isPrimary || false
        }))
      }
    },
    include: {
      addresses: true
    }
  });

  return listing;
}

export async function createTestDirectory(): Promise<Directory> {
  const prisma = getTestPrisma();

  // Get test category and city
  const category = await prisma.category.findFirst();
  const city = await prisma.city.findFirst();

  if (!category || !city) {
    throw new Error('Test category and city must exist. Did seedTestData run?');
  }

  const directory = await prisma.directory.create({
    data: {
      title: `Test Directory ${Date.now()}`,
      slug: `test-dir-${Date.now()}`,
      subdomain: `test${Date.now()}`,
      subdirectory: null,
      status: 'PUBLISHED',
      categoryId: category.id,
      cityId: city.id,
      location: {
        create: {
          cityId: city.id
        }
      }
    }
  });

  return directory;
}

export async function createTestCategory(name?: string, slug?: string): Promise<Category> {
  const prisma = getTestPrisma();

  const timestamp = Date.now();
  const category = await prisma.category.create({
    data: {
      name: name || `Test Category ${timestamp}`,
      slug: slug || `test-category-${timestamp}`
    }
  });

  return category;
}

export async function createApprovedListing(
  options: CreateListingOptions = {}
): Promise<Listing & { addresses: ListingAddress[] }> {
  return createTestListing({
    ...options,
    status: 'APPROVED'
  });
}

export async function createPendingListing(
  options: CreateListingOptions = {}
): Promise<Listing & { addresses: ListingAddress[] }> {
  return createTestListing({
    ...options,
    status: 'PENDING'
  });
}

export async function linkListingToDirectory(
  listingId: number,
  directoryId: number
): Promise<void> {
  const prisma = getTestPrisma();

  await prisma.directoryListing.create({
    data: {
      listingId,
      directoryId
    }
  });
}
