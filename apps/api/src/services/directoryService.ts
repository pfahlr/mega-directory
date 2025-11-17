import { prisma } from '../db';
import { NotFoundError, ConflictError, BadRequestError } from '../errors';
import type { Directory, DirectoryStatus } from '@prisma/client';

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
 * Get all directories with relations
 */
export async function getAllDirectories(): Promise<DirectoryWithRelations[]> {
  return await prisma.directory.findMany({
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
    },
    orderBy: { createdAt: 'desc' },
  }) as any;
}

/**
 * Get active directories for public API
 */
export async function getActiveDirectories(): Promise<DirectoryWithRelations[]> {
  return await prisma.directory.findMany({
    where: { status: 'ACTIVE' },
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
    },
    orderBy: { createdAt: 'desc' },
  }) as any;
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

  return directory;
}

/**
 * Create new directory
 */
export async function createDirectory(data: CreateDirectoryDto): Promise<DirectoryWithRelations> {
  try {
    const directory = await prisma.directory.create({
      data: {
        title: data.title,
        slug: data.slug,
        subdomain: data.subdomain,
        subdirectory: data.subdirectory,
        categoryId: data.categoryId,
        locationId: data.locationId,
        locationAgnostic: data.locationAgnostic || false,
        status: data.status || 'DRAFT',
        heroTitle: data.heroTitle,
        heroSubtitle: data.heroSubtitle,
        introMarkdown: data.introMarkdown,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        metaKeywords: data.metaKeywords,
        ogImageUrl: data.ogImageUrl,
      },
      include: {
        category: true,
        location: true,
      },
    });

    return directory;
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
    const directory = await prisma.directory.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.subdomain !== undefined && { subdomain: data.subdomain }),
        ...(data.subdirectory !== undefined && { subdirectory: data.subdirectory }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.locationAgnostic !== undefined && { locationAgnostic: data.locationAgnostic }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.heroTitle !== undefined && { heroTitle: data.heroTitle }),
        ...(data.heroSubtitle !== undefined && { heroSubtitle: data.heroSubtitle }),
        ...(data.introMarkdown !== undefined && { introMarkdown: data.introMarkdown }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.metaKeywords !== undefined && { metaKeywords: data.metaKeywords }),
        ...(data.ogImageUrl !== undefined && { ogImageUrl: data.ogImageUrl }),
      },
      include: {
        category: true,
        location: true,
      },
    });

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
