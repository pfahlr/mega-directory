import { prisma } from '../db';
import { NotFoundError, ConflictError, BadRequestError } from '../errors';
import type { Listing, ListingAddress, ListingStatus } from '@prisma/client';
import {
  normalizePaginationParams,
  createPaginatedResponse,
  type PaginationParams,
  type PaginatedResponse,
} from '../utils/pagination';

export interface CreateListingDto {
  title: string;
  slug: string;
  status?: ListingStatus;
  summary?: string | null;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  sourceName?: string | null;
  tagline?: string | null;
  categoryIds?: number[];
  addresses?: CreateAddressDto[];
}

export interface UpdateListingDto {
  title?: string;
  slug?: string;
  status?: ListingStatus;
  summary?: string | null;
  websiteUrl?: string | null;
  sourceUrl?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
  sourceName?: string | null;
  tagline?: string | null;
  categoryIds?: number[];
  addresses?: CreateAddressDto[];
}

export interface CreateAddressDto {
  label?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary?: boolean;
}

export interface UpdateAddressDto {
  label?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary?: boolean;
}

export interface ListingWithRelations extends Listing {
  addresses: ListingAddress[];
  categories: Array<{ category: { id: number; name: string; slug: string } }>;
}

/**
 * Get all listings with their relations (paginated)
 */
export async function getAllListings(
  params?: PaginationParams
): Promise<PaginatedResponse<ListingWithRelations>> {
  const { page, limit, skip, take } = normalizePaginationParams(params || {});

  const include = {
    addresses: true,
    categories: {
      include: {
        category: true,
      },
    },
  };

  const [data, totalCount] = await Promise.all([
    prisma.listing.findMany({
      include,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.listing.count(),
  ]);

  return createPaginatedResponse(data, page, limit, totalCount);
}

/**
 * Get listing by ID with relations
 */
export async function getListingById(id: number): Promise<ListingWithRelations> {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      addresses: true,
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!listing) {
    throw new NotFoundError('Listing', id);
  }

  return listing;
}

/**
 * Create new listing with addresses and category relations
 */
export async function createListing(data: CreateListingDto): Promise<ListingWithRelations> {
  try {
    // Ensure at least one address is provided if addresses exist
    if (data.addresses && data.addresses.length > 0) {
      const hasPrimary = data.addresses.some(addr => addr.isPrimary);
      if (!hasPrimary) {
        data.addresses[0].isPrimary = true;
      }
    }

    const listing = await prisma.listing.create({
      data: {
        title: data.title,
        slug: data.slug,
        status: data.status || 'PENDING',
        summary: data.summary,
        websiteUrl: data.websiteUrl,
        sourceUrl: data.sourceUrl,
        contactEmail: data.contactEmail,
        notes: data.notes,
        sourceName: data.sourceName,
        tagline: data.tagline,
        addresses: data.addresses
          ? {
              create: data.addresses.map(addr => ({
                label: addr.label,
                addressLine1: addr.addressLine1,
                addressLine2: addr.addressLine2,
                city: addr.city,
                region: addr.region,
                postalCode: addr.postalCode,
                country: addr.country || 'US',
                latitude: addr.latitude,
                longitude: addr.longitude,
                isPrimary: addr.isPrimary || false,
              })),
            }
          : undefined,
        categories: data.categoryIds
          ? {
              create: data.categoryIds.map(categoryId => ({
                category: { connect: { id: categoryId } },
              })),
            }
          : undefined,
      },
      include: {
        addresses: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return listing;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('Listing with this slug already exists', 'slug');
    }
    if (error.code === 'P2003') {
      throw new BadRequestError('Invalid category ID provided');
    }
    throw error;
  }
}

/**
 * Update listing
 */
export async function updateListing(
  id: number,
  data: UpdateListingDto
): Promise<ListingWithRelations> {
  try {
    // Check if listing exists
    await getListingById(id);

    // Handle category updates
    if (data.categoryIds !== undefined) {
      // Remove existing categories
      await prisma.listingCategory.deleteMany({
        where: { listingId: id },
      });
    }

    // Handle address updates
    if (data.addresses !== undefined) {
      // Remove existing addresses
      await prisma.listingAddress.deleteMany({
        where: { listingId: id },
      });

      // Ensure at least one address is primary
      if (data.addresses.length > 0) {
        const hasPrimary = data.addresses.some(addr => addr.isPrimary);
        if (!hasPrimary) {
          data.addresses[0].isPrimary = true;
        }
      }
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl }),
        ...(data.sourceUrl !== undefined && { sourceUrl: data.sourceUrl }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.sourceName !== undefined && { sourceName: data.sourceName }),
        ...(data.tagline !== undefined && { tagline: data.tagline }),
        ...(data.addresses !== undefined && {
          addresses: {
            create: data.addresses.map(addr => ({
              label: addr.label,
              addressLine1: addr.addressLine1,
              addressLine2: addr.addressLine2,
              city: addr.city,
              region: addr.region,
              postalCode: addr.postalCode,
              country: addr.country || 'US',
              latitude: addr.latitude,
              longitude: addr.longitude,
              isPrimary: addr.isPrimary || false,
            })),
          },
        }),
        ...(data.categoryIds !== undefined && {
          categories: {
            create: data.categoryIds.map(categoryId => ({
              category: { connect: { id: categoryId } },
            })),
          },
        }),
      },
      include: {
        addresses: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return listing;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('Listing with this slug already exists', 'slug');
    }
    if (error.code === 'P2003') {
      throw new BadRequestError('Invalid category ID provided');
    }
    throw error;
  }
}

/**
 * Delete listing
 */
export async function deleteListing(id: number): Promise<void> {
  try {
    await prisma.listing.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new NotFoundError('Listing', id);
    }
    throw error;
  }
}

/**
 * Batch update listing statuses
 */
export async function batchUpdateListings(
  updates: Array<{ id: number; status?: ListingStatus; title?: string; websiteUrl?: string | null; notes?: string | null }>
): Promise<{ delivered: number; failed: Array<{ id: number; reason: string }> }> {
  let delivered = 0;
  const failed: Array<{ id: number; reason: string }> = [];

  for (const update of updates) {
    try {
      await prisma.listing.update({
        where: { id: update.id },
        data: {
          ...(update.status !== undefined && { status: update.status }),
          ...(update.title !== undefined && { title: update.title }),
          ...(update.websiteUrl !== undefined && { websiteUrl: update.websiteUrl }),
          ...(update.notes !== undefined && { notes: update.notes }),
        },
      });
      delivered++;
    } catch (error: any) {
      if (error.code === 'P2025') {
        failed.push({ id: update.id, reason: 'Listing not found' });
      } else {
        failed.push({ id: update.id, reason: 'Update failed' });
      }
    }
  }

  return { delivered, failed };
}

// Address-specific operations

/**
 * Get all addresses (paginated)
 */
export async function getAllAddresses(
  params?: PaginationParams
): Promise<PaginatedResponse<ListingAddress>> {
  const { page, limit, skip, take } = normalizePaginationParams(params || {});

  const [data, totalCount] = await Promise.all([
    prisma.listingAddress.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.listingAddress.count(),
  ]);

  return createPaginatedResponse(data, page, limit, totalCount);
}

/**
 * Get address by ID
 */
export async function getAddressById(id: number): Promise<ListingAddress> {
  const address = await prisma.listingAddress.findUnique({
    where: { id },
  });

  if (!address) {
    throw new NotFoundError('Address', id);
  }

  return address;
}

/**
 * Create address for listing
 */
export async function createAddress(
  listingId: number,
  data: CreateAddressDto
): Promise<ListingAddress> {
  // Verify listing exists
  await getListingById(listingId);

  // Check if this should be primary (first address or explicitly set)
  const existingAddresses = await prisma.listingAddress.count({
    where: { listingId },
  });

  const isPrimary = data.isPrimary !== undefined ? data.isPrimary : existingAddresses === 0;

  const address = await prisma.listingAddress.create({
    data: {
      listingId,
      label: data.label,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      region: data.region,
      postalCode: data.postalCode,
      country: data.country || 'US',
      latitude: data.latitude,
      longitude: data.longitude,
      isPrimary,
    },
  });

  // If this is set as primary, unset all other primaries for this listing
  if (isPrimary) {
    await prisma.listingAddress.updateMany({
      where: {
        listingId,
        id: { not: address.id },
      },
      data: { isPrimary: false },
    });
  }

  return address;
}

/**
 * Update address
 */
export async function updateAddress(
  id: number,
  data: UpdateAddressDto
): Promise<ListingAddress> {
  try {
    const existingAddress = await getAddressById(id);

    const address = await prisma.listingAddress.update({
      where: { id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.region !== undefined && { region: data.region }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.country !== undefined && { country: data.country || 'US' }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary }),
      },
    });

    // If this is set as primary, unset all other primaries for this listing
    if (data.isPrimary === true) {
      await prisma.listingAddress.updateMany({
        where: {
          listingId: existingAddress.listingId,
          id: { not: address.id },
        },
        data: { isPrimary: false },
      });
    } else if (data.isPrimary === false) {
      // Ensure at least one address is primary
      const primaryCount = await prisma.listingAddress.count({
        where: {
          listingId: existingAddress.listingId,
          isPrimary: true,
        },
      });

      if (primaryCount === 0) {
        // Set the first address as primary
        const firstAddress = await prisma.listingAddress.findFirst({
          where: { listingId: existingAddress.listingId },
          orderBy: { createdAt: 'asc' },
        });

        if (firstAddress) {
          await prisma.listingAddress.update({
            where: { id: firstAddress.id },
            data: { isPrimary: true },
          });
        }
      }
    }

    return address;
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new NotFoundError('Address', id);
    }
    throw error;
  }
}

/**
 * Delete address
 */
export async function deleteAddress(id: number): Promise<void> {
  try {
    const address = await getAddressById(id);
    const wasPrimary = address.isPrimary;

    await prisma.listingAddress.delete({
      where: { id },
    });

    // If we deleted the primary address, set another one as primary
    if (wasPrimary) {
      const nextAddress = await prisma.listingAddress.findFirst({
        where: { listingId: address.listingId },
        orderBy: { createdAt: 'asc' },
      });

      if (nextAddress) {
        await prisma.listingAddress.update({
          where: { id: nextAddress.id },
          data: { isPrimary: true },
        });
      }
    }
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new NotFoundError('Address', id);
    }
    throw error;
  }
}
