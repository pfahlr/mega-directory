/**
 * Database Seed Script
 *
 * This script populates the database with sample data for development and testing.
 * Run with: npm run db:seed
 *
 * The script is idempotent - it can be run multiple times safely.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (development only!)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Clearing existing data...');
    await prisma.featuredListingSlot.deleteMany();
    await prisma.listingCategory.deleteMany();
    await prisma.listingAddress.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.directory.deleteMany();
    await prisma.category.deleteMany();
    await prisma.location.deleteMany();
    await prisma.city.deleteMany();
    await prisma.state.deleteMany();
    await prisma.country.deleteMany();
  }

  // Seed Countries
  console.log('🌍 Seeding countries...');
  const usa = await prisma.country.upsert({
    where: { code: 'US' },
    update: {},
    create: {
      name: 'United States',
      code: 'US',
      latitude: 37.09024,
      longitude: -95.712891,
      hasStates: true,
      hasPostalCodes: true,
    },
  });

  // Seed States
  console.log('🏛️  Seeding states...');
  const california = await prisma.state.upsert({
    where: { code: 'CA' },
    update: {},
    create: {
      name: 'California',
      code: 'CA',
      countryId: usa.id,
      latitude: 36.778259,
      longitude: -119.417931,
      hasCities: true,
    },
  });

  const newYork = await prisma.state.upsert({
    where: { code: 'NY' },
    update: {},
    create: {
      name: 'New York',
      code: 'NY',
      countryId: usa.id,
      latitude: 40.7128,
      longitude: -74.0060,
      hasCities: true,
    },
  });

  // Seed Cities
  console.log('🏙️  Seeding cities...');
  const sanFrancisco = await prisma.city.upsert({
    where: { name_stateId: { name: 'San Francisco', stateId: california.id } },
    update: {},
    create: {
      name: 'San Francisco',
      stateId: california.id,
      latitude: 37.7749,
      longitude: -122.4194,
      population: 873965,
    },
  });

  const nyc = await prisma.city.upsert({
    where: { name_stateId: { name: 'New York', stateId: newYork.id } },
    update: {},
    create: {
      name: 'New York',
      stateId: newYork.id,
      latitude: 40.7128,
      longitude: -74.0060,
      population: 8336817,
    },
  });

  // Seed Locations
  console.log('📍 Seeding locations...');
  const sfLocation = await prisma.location.create({
    data: {
      cityId: sanFrancisco.id,
    },
  });

  const nycLocation = await prisma.location.create({
    data: {
      cityId: nyc.id,
    },
  });

  // Seed Categories
  console.log('🏷️  Seeding categories...');
  const restaurantCategory = await prisma.category.upsert({
    where: { slug: 'restaurants' },
    update: {},
    create: {
      name: 'Restaurants',
      slug: 'restaurants',
      description: 'Find the best restaurants and dining experiences',
      metaTitle: 'Best Restaurants Directory',
      metaDescription: 'Discover top-rated restaurants in your area',
      isActive: true,
    },
  });

  const techCategory = await prisma.category.upsert({
    where: { slug: 'technology' },
    update: {},
    create: {
      name: 'Technology',
      slug: 'technology',
      description: 'Tech companies and startups',
      metaTitle: 'Technology Companies Directory',
      metaDescription: 'Find innovative tech companies and startups',
      isActive: true,
    },
  });

  const servicesCategory = await prisma.category.upsert({
    where: { slug: 'services' },
    update: {},
    create: {
      name: 'Services',
      slug: 'services',
      description: 'Professional services and consultants',
      metaTitle: 'Professional Services Directory',
      metaDescription: 'Find professional services and expert consultants',
      isActive: true,
    },
  });

  // Seed Directories
  console.log('📁 Seeding directories...');
  const sfDirectory = await prisma.directory.upsert({
    where: { slug: 'san-francisco-guide' },
    update: {},
    create: {
      title: 'San Francisco Business Guide',
      slug: 'san-francisco-guide',
      subdomain: 'sf',
      subdirectory: 'san-francisco',
      categoryId: restaurantCategory.id,
      locationId: sfLocation.id,
      status: 'ACTIVE',
      heroTitle: 'Discover San Francisco',
      heroSubtitle: 'The best businesses in the Bay Area',
      introMarkdown: '# Welcome to San Francisco\n\nExplore the best businesses and services in the city.',
      metaTitle: 'San Francisco Business Directory',
      metaDescription: 'Find the best businesses in San Francisco',
    },
  });

  const nycDirectory = await prisma.directory.upsert({
    where: { slug: 'new-york-guide' },
    update: {},
    create: {
      title: 'New York City Business Guide',
      slug: 'new-york-guide',
      subdomain: 'nyc',
      subdirectory: 'new-york',
      categoryId: servicesCategory.id,
      locationId: nycLocation.id,
      status: 'ACTIVE',
      heroTitle: 'Discover New York City',
      heroSubtitle: 'The city that never sleeps',
      introMarkdown: '# Welcome to NYC\n\nFind the best services and businesses in New York City.',
      metaTitle: 'New York City Business Directory',
      metaDescription: 'Discover top-rated businesses in NYC',
    },
  });

  // Seed Listings
  console.log('📝 Seeding listings...');
  const listing1 = await prisma.listing.create({
    data: {
      title: 'Golden Gate Pizza',
      slug: 'golden-gate-pizza',
      status: 'ACTIVE',
      summary: 'Authentic Italian pizza in the heart of San Francisco',
      tagline: 'Best pizza in SF!',
      websiteUrl: 'https://example.com/ggpizza',
      contactEmail: 'info@ggpizza.com',
      addresses: {
        create: {
          label: 'Main Location',
          addressLine1: '123 Market St',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94103',
          country: 'US',
          latitude: 37.7749,
          longitude: -122.4194,
          isPrimary: true,
        },
      },
      categories: {
        create: {
          categoryId: restaurantCategory.id,
        },
      },
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      title: 'TechStart Solutions',
      slug: 'techstart-solutions',
      status: 'ACTIVE',
      summary: 'Innovative software solutions for startups',
      tagline: 'Build your future with us',
      websiteUrl: 'https://example.com/techstart',
      contactEmail: 'hello@techstart.com',
      addresses: {
        create: {
          label: 'HQ',
          addressLine1: '456 Broadway',
          addressLine2: 'Suite 300',
          city: 'New York',
          region: 'NY',
          postalCode: '10013',
          country: 'US',
          latitude: 40.7128,
          longitude: -74.0060,
          isPrimary: true,
        },
      },
      categories: {
        create: [
          { categoryId: techCategory.id },
          { categoryId: servicesCategory.id },
        ],
      },
    },
  });

  const listing3 = await prisma.listing.create({
    data: {
      title: 'Bay Area Consulting',
      slug: 'bay-area-consulting',
      status: 'PENDING',
      summary: 'Professional business consulting services',
      websiteUrl: 'https://example.com/baconsulting',
      addresses: {
        create: {
          label: 'Office',
          addressLine1: '789 Mission St',
          city: 'San Francisco',
          region: 'CA',
          postalCode: '94105',
          country: 'US',
          latitude: 37.7849,
          longitude: -122.4094,
          isPrimary: true,
        },
      },
      categories: {
        create: {
          categoryId: servicesCategory.id,
        },
      },
    },
  });

  // Seed Featured Listing Slots
  console.log('⭐ Seeding featured listing slots...');
  await prisma.featuredListingSlot.create({
    data: {
      directoryId: sfDirectory.id,
      listingId: listing1.id,
      tier: '1',
      position: 1,
    },
  });

  await prisma.featuredListingSlot.create({
    data: {
      directoryId: nycDirectory.id,
      listingId: listing2.id,
      tier: '1',
      position: 1,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  - Countries: 1');
  console.log('  - States: 2');
  console.log('  - Cities: 2');
  console.log('  - Locations: 2');
  console.log('  - Categories: 3');
  console.log('  - Directories: 2');
  console.log('  - Listings: 3');
  console.log('  - Featured Slots: 2');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
