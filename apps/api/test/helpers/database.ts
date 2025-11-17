import { PrismaClient } from '@prisma/client';

let prismaClient: PrismaClient;

export async function setupTestDatabase(): Promise<void> {
  try {
    console.log('Setting up test database...');

    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Tests require a database connection.');
    }

    // Initialize Prisma client
    prismaClient = new PrismaClient({
      log: ['error', 'warn']
    });

    await prismaClient.$connect();
    console.log('Prisma client connected');

    // Clean existing data
    await cleanDatabase();

    // Seed minimal test data
    await seedTestData();
    console.log('Test data seeded');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function teardownTestDatabase(): Promise<void> {
  try {
    if (prismaClient) {
      // Clean up test data
      await cleanDatabase();
      await prismaClient.$disconnect();
    }
  } catch (error) {
    console.error('Failed to teardown test database:', error);
  }
}

async function cleanDatabase(): Promise<void> {
  if (!prismaClient) {
    return;
  }

  // Delete in order to respect foreign key constraints
  await prismaClient.directoryListing.deleteMany({});
  await prismaClient.listingAddress.deleteMany({});
  await prismaClient.listing.deleteMany({});
  await prismaClient.location.deleteMany({});
  await prismaClient.directory.deleteMany({});
  await prismaClient.category.deleteMany({});
  await prismaClient.city.deleteMany({});
  await prismaClient.state.deleteMany({});
  await prismaClient.country.deleteMany({});
}

export function getTestPrisma(): PrismaClient {
  if (!prismaClient) {
    throw new Error('Prisma client not initialized. Did you call setupTestDatabase()?');
  }
  return prismaClient;
}

async function seedTestData(): Promise<void> {
  // Create test countries
  const usa = await prismaClient.country.create({
    data: {
      name: 'United States',
      code: 'US'
    }
  });

  // Create test state
  const california = await prismaClient.state.create({
    data: {
      name: 'California',
      code: 'CA',
      countryId: usa.id
    }
  });

  // Create test city
  const sanFrancisco = await prismaClient.city.create({
    data: {
      name: 'San Francisco',
      stateId: california.id
    }
  });

  // Create test category
  const restaurantCategory = await prismaClient.category.create({
    data: {
      name: 'Restaurants',
      slug: 'restaurants'
    }
  });

  // Create test directory
  await prismaClient.directory.create({
    data: {
      title: 'Test Directory',
      slug: 'test-directory',
      subdomain: 'test',
      subdirectory: null,
      status: 'PUBLISHED',
      categoryId: restaurantCategory.id,
      cityId: sanFrancisco.id,
      location: {
        create: {
          cityId: sanFrancisco.id
        }
      }
    }
  });
}

export async function clearTestData(): Promise<void> {
  await cleanDatabase();
  // Reseed base data
  await seedTestData();
}
