import { PrismaClient, ListingStatus, DirectoryStatus, Prisma } from '@prisma/client';

/**
 * Database Connection Pool Configuration
 *
 * Connection pooling helps manage database connections efficiently.
 * Pool size should be configured based on your deployment and database limits.
 *
 * Formula: connection_limit = (num_physical_cpus * 2) + num_effective_spindle_disks
 * For most applications:
 * - Development: 5-10 connections
 * - Production: 10-20 connections per instance
 *
 * Environment Variables:
 * - DATABASE_URL: Must include connection_limit and pool_timeout parameters
 *   Example: postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
 * - DB_CONNECTION_LIMIT: Maximum number of connections (default: 10)
 * - DB_POOL_TIMEOUT: Seconds to wait for connection (default: 20)
 */

// Build DATABASE_URL with connection pool parameters if not already present
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Parse URL to check if pool parameters are already set
  const url = new URL(baseUrl);
  const hasConnectionLimit = url.searchParams.has('connection_limit');
  const hasPoolTimeout = url.searchParams.has('pool_timeout');

  // If already configured, return as-is
  if (hasConnectionLimit && hasPoolTimeout) {
    return baseUrl;
  }

  // Add connection pool parameters
  const connectionLimit = process.env.DB_CONNECTION_LIMIT ?? '10';
  const poolTimeout = process.env.DB_POOL_TIMEOUT ?? '20';

  if (!hasConnectionLimit) {
    url.searchParams.set('connection_limit', connectionLimit);
  }
  if (!hasPoolTimeout) {
    url.searchParams.set('pool_timeout', poolTimeout);
  }

  return url.toString();
}

// Initialize Prisma Client with connection pooling configuration
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: getDatabaseUrl(),
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
