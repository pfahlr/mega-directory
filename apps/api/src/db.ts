import { PrismaClient, ListingStatus, DirectoryStatus, Prisma } from '@prisma/client';

// Initialize Prisma Client with connection pooling configuration
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * Initialize Prisma connection and test database connectivity
 */
export async function initializePrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[db] Database connection successful');
  } catch (error) {
    console.error('[db] Database connection failed:', error);
    if (error instanceof Error) {
      error.message = `Failed to connect to database: ${error.message}`;
    }
    throw error;
  }
}

/**
 * Gracefully disconnect Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[db] Database connection closed');
  } catch (error) {
    console.error('[db] Error disconnecting from database:', error);
    if (error instanceof Error) {
      console.error('[db] Error details:', error.message);
    }
  }
}

/**
 * Get listings with full relations (addresses and categories)
 */
export async function getListingsWithRelations(filters: {
  status?: ListingStatus;
  directoryId?: number;
} = {}) {
  const where: Prisma.ListingWhereInput = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.directoryId) {
    where.directoryId = filters.directoryId;
  }

  return await prisma.listing.findMany({
    where,
    include: {
      addresses: true,
      categories: {
        include: {
          category: true,
        },
      },
      directory: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get all directories with nested data
 */
export async function getDirectoriesWithData() {
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
      listings: {
        where: {
          status: ListingStatus.APPROVED,
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
          listing: true,
        },
        orderBy: [
          { tier: 'asc' }, // HERO first, then PREMIUM, then STANDARD
          { position: 'asc' },
        ],
      },
    },
    where: {
      status: DirectoryStatus.ACTIVE,
    },
  });
}

/**
 * Create listing with address atomically
 */
export async function createListingWithAddress(data: {
  title: string;
  slug: string;
  websiteUrl?: string;
  summary?: string;
  addresses: Array<{
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
  categoryIds?: number[];
  status?: ListingStatus;
  directoryId?: number;
}) {
  return await prisma.listing.create({
    data: {
      title: data.title,
      slug: data.slug,
      websiteUrl: data.websiteUrl,
      summary: data.summary,
      status: data.status || ListingStatus.PENDING,
      directoryId: data.directoryId,
      addresses: {
        create: data.addresses,
      },
      ...(data.categoryIds && {
        categories: {
          create: data.categoryIds.map(categoryId => ({
            categoryId,
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
}
