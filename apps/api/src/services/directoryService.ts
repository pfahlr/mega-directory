import { prisma } from '../db';
import { NotFoundError, ConflictError, BadRequestError } from '../errors';
import type { Directory, DirectoryStatus } from '@prisma/client';
import { CacheInvalidation } from '../cache';
import {
  normalizePaginationParams,
  createPaginatedResponse,
  type PaginationParams,
  type PaginatedResponse,
} from '../utils/pagination';

export interface CreateDirectoryDto {
  title: string;
  slug: string;
  subdomain: string | null;
  subdirectory: string | null;
  categoryId: number;
  locationId?: string | null;
  locationAgnostic?: boolean;
  status?: DirectoryStatus;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  introMarkdown?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogImageUrl?: string | null;
  featuredLimit?: number | null;
}

export interface UpdateDirectoryDto {
  title?: string;
  slug?: string;
  subdomain?: string | null;
  subdirectory?: string | null;
  categoryId?: number;
  locationId?: string | null;
  locationAgnostic?: boolean;
  status?: DirectoryStatus;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  introMarkdown?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogImageUrl?: string | null;
  featuredLimit?: number | null;
}

export interface DirectoryWithRelations extends Directory {
  category: { id: number; name: string; slug: string } | null;
  location: any | null;
  listings?: Array<{
    id: number;
    title: string;
    slug: string;
    addresses: Array<any>;
  }>;
  featuredSlots?: Array<{
    tier: number;
    position: number;
    listing: any;
  }>;
}

/**
 * Get all directories with relations (paginated)
 */
export async function getAllDirectories(
  params?: PaginationParams
): Promise<PaginatedResponse<DirectoryWithRelations>> {
  const { page, limit, skip, take } = normalizePaginationParams(params || {});

  const include = {
    category: true,
    location: {
      include: {
        cityRecord: {
          include: {
            state: {
              include: {
                country: true,
              },
            },
            country: true,
          },
        },
        stateRecord: {
          include: {
            country: true,
          },
        },
        countryRecord: true,
      },
    },
  };

  const [data, totalCount] = await Promise.all([
    prisma.directory.findMany({
      include: include as any,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.directory.count(),
  ]);

  return createPaginatedResponse(data as any, page, limit, totalCount);
}

/**
 * Get active directories for public API (paginated)
 */
export async function getActiveDirectories(
  params?: PaginationParams
): Promise<PaginatedResponse<DirectoryWithRelations>> {
  const { page, limit, skip, take } = normalizePaginationParams(params || {});

  const include = {
    category: true,
    location: {
      include: {
        cityRecord: {
          include: {
            state: {
              include: {
                country: true,
              },
            },
            country: true,
          },
        },
        stateRecord: {
          include: {
            country: true,
          },
        },
        countryRecord: true,
      },
    },
    listings: {
      where: { status: 'APPROVED' },
      include: {
        addresses: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    },
    featuredSlots: {
      include: {
        listing: {
          include: {
            addresses: true,
          },
        },
      },
      orderBy: [{ tier: 'asc' }, { position: 'asc' }],
    },
  };

  const [data, totalCount] = await Promise.all([
    prisma.directory.findMany({
      where: { status: 'ACTIVE' },
      include: include as any,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.directory.count({ where: { status: 'ACTIVE' } }),
  ]);

  return createPaginatedResponse(data as any, page, limit, totalCount);
}

/**
 * Get directory by ID with relations
 */
export async function getDirectoryById(id: number): Promise<DirectoryWithRelations> {
  const directory = await prisma.directory.findUnique({
    where: { id },
    include: {
      category: true,
      location: {
        include: {
          cityRecord: {
            include: {
              state: {
                include: {
                  country: true,
                },
              },
            },
          },
        },
      },
      listings: {
        include: {
          addresses: true,
        },
      },
    },
  });

  if (!directory) {
    throw new NotFoundError('Directory', id);
  }

  return directory;
}

/**
 * Get directory by slug for public API
 */
export async function getDirectoryBySlug(slug: string): Promise<DirectoryWithRelations> {
  const directory = await prisma.directory.findUnique({
    where: { slug },
    include: {
      category: true,
      location: {
        include: {
          cityRecord: {
            include: {
              state: {
                include: {
                  country: true,
                },
              },
            },
          },
        },
      },
      listings: {
        where: {
          status: 'APPROVED',
        },
        include: {
          addresses: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      },
      featuredSlots: {
        include: {
          listing: {
            include: {
              addresses: true,
            },
          },
        },
        orderBy: [{ tier: 'asc' }, { position: 'asc' }],
      },
    },
  });

  if (!directory) {
    throw new NotFoundError('Directory');
  }

  if (directory.status !== 'ACTIVE') {
    throw new NotFoundError('Directory');
  }

  return directory as any;
}

/**
 * Create new directory
 */
export async function createDirectory(data: CreateDirectoryDto): Promise<DirectoryWithRelations> {
  try {
    const locationId = await resolveLocationId(data.locationId as any, data.locationAgnostic);
    const directory = await prisma.directory.create({
      data: {
        title: data.title,
        slug: data.slug,
        subdomain: (data.subdomain ?? null) as any,
        subdirectory: (data.subdirectory ?? null) as any,
        categoryId: data.categoryId,
        locationId: locationId as any,
        locationAgnostic: Boolean(data.locationAgnostic),
        status: data.status || 'DRAFT',
        heroTitle: data.heroTitle ?? null,
        heroSubtitle: data.heroSubtitle ?? null,
        introMarkdown: data.introMarkdown ?? null,
        metaTitle: data.metaTitle ?? null,
        metaDescription: data.metaDescription ?? null,
        metaKeywords: data.metaKeywords ?? null,
        ogImageUrl: data.ogImageUrl ?? null,
        featuredLimit: data.featuredLimit ?? undefined,
      },
      include: {
        category: true,
        location: true,
      },
    });

    // Invalidate caches
    await CacheInvalidation.directories();

    return directory as any;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('Directory with this slug/subdomain already exists');
    }
    if (error.code === 'P2003') {
      throw new BadRequestError('Invalid category ID or location ID');
    }
    throw error;
  }
}

/**
 * Update directory
 */
export async function updateDirectory(
  id: number,
  data: UpdateDirectoryDto
): Promise<DirectoryWithRelations> {
  try {
    const locationId =
      data.locationId !== undefined || data.locationAgnostic !== undefined
        ? await resolveLocationId(data.locationId as any, data.locationAgnostic)
        : undefined;
    const directory = await prisma.directory.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.subdomain !== undefined && { subdomain: data.subdomain }),
        ...(data.subdirectory !== undefined && { subdirectory: data.subdirectory }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(locationId !== undefined && { locationId }),
        ...(data.locationAgnostic !== undefined && { locationAgnostic: data.locationAgnostic }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.heroTitle !== undefined && { heroTitle: data.heroTitle }),
        ...(data.heroSubtitle !== undefined && { heroSubtitle: data.heroSubtitle }),
        ...(data.introMarkdown !== undefined && { introMarkdown: data.introMarkdown }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.metaKeywords !== undefined && { metaKeywords: data.metaKeywords }),
        ...(data.featuredLimit !== undefined && { featuredLimit: data.featuredLimit }),
        ...(data.ogImageUrl !== undefined && { ogImageUrl: data.ogImageUrl }),
      } as any,
      include: {
        category: true,
        location: true,
      },
    });

    // Invalidate caches
    await CacheInvalidation.directory(id, directory.slug);

    return directory as any;
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new NotFoundError('Directory', id);
    }
    if (error.code === 'P2002') {
      throw new ConflictError('Directory with this slug/subdomain already exists');
    }
    if (error.code === 'P2003') {
      throw new BadRequestError('Invalid category ID or location ID');
    }
    throw error;
  }
}

/**
 * Delete directory
 */
export async function deleteDirectory(id: number): Promise<void> {
  try {
    await prisma.directory.delete({
      where: { id },
    });

    // Invalidate caches
    await CacheInvalidation.directory(id);
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new NotFoundError('Directory', id);
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      throw new ConflictError('Cannot delete directory with associated listings');
    }
    throw error;
  }
}

async function resolveLocationId(
  input: string | number | null | undefined,
  locationAgnostic?: boolean
): Promise<number | null> {
  if (locationAgnostic) {
    return null;
  }
  if (input === undefined || input === null || input === '') {
    return null;
  }

  const numeric = typeof input === 'string' ? Number(input) : input;
  if (typeof numeric === 'number' && Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }

  if (typeof input === 'string') {
    const location = await prisma.location.findUnique({
      where: { slug: input }
    });
    if (location) {
      return location.id;
    }
  }

  throw new BadRequestError('Invalid locationId');
}
