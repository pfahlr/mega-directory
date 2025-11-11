import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: 'placeholder-hash',
      displayName: 'Demo Admin',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });

  const servicesCategory = await prisma.category.upsert({
    where: { slug: 'professional-services' },
    update: {},
    create: {
      name: 'Professional Services',
      slug: 'professional-services',
      description: 'Verified professionals for home and commercial needs.',
      metaTitle: 'Professional Services Directory',
      metaDescription: 'Browse vetted professional services by location and specialty.'
    }
  });

  const jobsCategory = await prisma.category.upsert({
    where: { slug: 'jobs' },
    update: {},
    create: {
      name: 'Jobs',
      slug: 'jobs',
      description: 'Hiring and recruiting partners in major metros.',
      metaTitle: 'Job Boards & Recruiters',
      metaDescription: 'Top job boards and recruiting agencies curated for your city.'
    }
  });

  const nyc = await prisma.location.upsert({
    where: { slug: 'new-york-city' },
    update: {},
    create: {
      name: 'New York City',
      slug: 'new-york-city',
      state: 'NY',
      country: 'US',
      timezone: 'America/New_York'
    }
  });

  const sf = await prisma.location.upsert({
    where: { slug: 'san-francisco' },
    update: {},
    create: {
      name: 'San Francisco',
      slug: 'san-francisco',
      state: 'CA',
      country: 'US',
      timezone: 'America/Los_Angeles'
    }
  });

  const nycDirectory = await prisma.directory.upsert({
    where: { slug: 'professional-services-new-york-city' },
    update: {},
    create: {
      name: 'NYC Professional Services',
      slug: 'professional-services-new-york-city',
      subdomain: 'services.nyc',
      hostname: 'services.nyc.example.com',
      heroTitle: 'Trusted Pros in New York City',
      heroSubtitle: 'Browse curated electricians, plumbers, HVAC, and more.',
      status: 'ACTIVE',
      isActive: true,
      metaTitle: 'Professional Services in NYC',
      metaDescription: 'Hand-reviewed professional services in the five boroughs.',
      categoryId: servicesCategory.id,
      locationId: nyc.id
    }
  });

  await prisma.directory.upsert({
    where: { slug: 'professional-services-san-francisco' },
    update: {},
    create: {
      name: 'SF Professional Services',
      slug: 'professional-services-san-francisco',
      subdomain: 'services.sf',
      hostname: 'services.sf.example.com',
      heroTitle: 'Bay Area Specialists',
      heroSubtitle: 'Top-rated maintainers for your next remodel or repair.',
      status: 'DRAFT',
      isActive: false,
      categoryId: servicesCategory.id,
      locationId: sf.id
    }
  });

  await prisma.directory.upsert({
    where: { slug: 'jobs-new-york-city' },
    update: {},
    create: {
      name: 'NYC Jobs Directory',
      slug: 'jobs-new-york-city',
      subdomain: 'jobs.nyc',
      hostname: 'jobs.nyc.example.com',
      heroTitle: 'Hiring in NYC',
      heroSubtitle: 'Recruiting partners for finance, media, and tech.',
      status: 'DRAFT',
      categoryId: jobsCategory.id,
      locationId: nyc.id
    }
  });

  const electricalSubcategory = await prisma.subcategory.upsert({
    where: {
      categoryId_slug: { categoryId: servicesCategory.id, slug: 'electricians' }
    },
    update: {},
    create: {
      name: 'Electricians',
      slug: 'electricians',
      description: 'Licensed electricians for residential and commercial projects.',
      categoryId: servicesCategory.id
    }
  });

  const hvacSubcategory = await prisma.subcategory.upsert({
    where: {
      categoryId_slug: { categoryId: servicesCategory.id, slug: 'hvac' }
    },
    update: {},
    create: {
      name: 'HVAC',
      slug: 'hvac',
      description: 'Heating and cooling specialists keeping climates steady.',
      categoryId: servicesCategory.id
    }
  });

  const facilitiesSubcategory = await prisma.subcategory.upsert({
    where: {
      categoryId_slug: { categoryId: servicesCategory.id, slug: 'facilities' }
    },
    update: {},
    create: {
      name: 'Facilities & Maintenance',
      slug: 'facilities',
      description: 'Union crews covering multi-trade repairs and hospitality programs.',
      categoryId: servicesCategory.id
    }
  });

  const listing = await prisma.listing.upsert({
    where: { slug: 'bright-sparks-electric' },
    update: {},
    create: {
      title: 'Bright Sparks Electric Co.',
      slug: 'bright-sparks-electric',
      tagline: '24/7 commercial surge protection and panel upgrades.',
      summary: 'Master electricians covering Manhattan, Brooklyn, and Queens with rapid dispatch teams.',
      description:
        'Bright Sparks Electric specializes in large-scale tenant improvements, structured wiring, and EV charger installs. Technicians hold NABCEP and UL certifications.',
      websiteUrl: 'https://brightsparks.example.com',
      contactEmail: 'hello@brightsparks.example.com',
      contactPhone: '+1-212-555-0199',
      addressLine1: '45 Water Street',
      city: 'New York',
      region: 'NY',
      postalCode: '10004',
      country: 'US',
      status: 'APPROVED',
      isClaimed: true,
      isSponsored: true,
      score: 87.4,
      rating: 4.9,
      reviewCount: 128,
      sourceName: 'demo-seed',
      sourceId: 'seed-bright-sparks',
      ingestedAt: new Date(),
      approvedAt: new Date(),
      publishedAt: new Date(),
      approvedById: adminUser.id,
      categoryId: servicesCategory.id,
      locationId: nyc.id,
      directoryId: nycDirectory.id
    }
  });

  await prisma.listingSubcategory.upsert({
    where: {
      listingId_subcategoryId: {
        listingId: listing.id,
        subcategoryId: electricalSubcategory.id
      }
    },
    update: {},
    create: {
      listingId: listing.id,
      subcategoryId: electricalSubcategory.id
    }
  });

  await prisma.listingSubcategory.upsert({
    where: {
      listingId_subcategoryId: {
        listingId: listing.id,
        subcategoryId: hvacSubcategory.id
      }
    },
    update: {},
    create: {
      listingId: listing.id,
      subcategoryId: hvacSubcategory.id
    }
  });

  const harborListing = await prisma.listing.upsert({
    where: { slug: 'harbor-hvac-collective' },
    update: {},
    create: {
      title: 'Harbor HVAC Collective',
      slug: 'harbor-hvac-collective',
      tagline: 'Electrification-focused HVAC retrofits.',
      summary:
        'Heat pump retrofits, VRF rebuilds, and IAQ instrumentation for mixed-use towers.',
      websiteUrl: 'https://harborhvac.example.com',
      contactEmail: 'contact@harborhvac.example.com',
      contactPhone: '+1-929-555-0100',
      status: 'APPROVED',
      score: 90.1,
      rating: 4.7,
      reviewCount: 64,
      sourceName: 'demo-seed',
      sourceId: 'seed-harbor-hvac',
      ingestedAt: new Date(),
      approvedAt: new Date(),
      publishedAt: new Date(),
      approvedById: adminUser.id,
      categoryId: servicesCategory.id,
      locationId: nyc.id,
      directoryId: nycDirectory.id
    }
  });

  await prisma.listingSubcategory.upsert({
    where: {
      listingId_subcategoryId: {
        listingId: harborListing.id,
        subcategoryId: hvacSubcategory.id
      }
    },
    update: {},
    create: {
      listingId: harborListing.id,
      subcategoryId: hvacSubcategory.id
    }
  });

  const steadfastListing = await prisma.listing.upsert({
    where: { slug: 'uptown-steadfast-maintenance' },
    update: {},
    create: {
      title: 'Uptown Steadfast Maintenance',
      slug: 'uptown-steadfast-maintenance',
      tagline: 'Union shop for concierge-level repairs.',
      summary:
        'Rotating crews for plumbing, millwork, and finish carpentry with a 3-hour onsite guarantee.',
      websiteUrl: 'https://steadfast.example.com',
      contactEmail: 'hello@steadfast.example.com',
      contactPhone: '+1-917-555-0105',
      status: 'APPROVED',
      score: 82.4,
      rating: 4.5,
      reviewCount: 42,
      sourceName: 'demo-seed',
      sourceId: 'seed-uptown-steadfast',
      ingestedAt: new Date(),
      approvedAt: new Date(),
      publishedAt: new Date(),
      approvedById: adminUser.id,
      categoryId: servicesCategory.id,
      locationId: nyc.id,
      directoryId: nycDirectory.id
    }
  });

  await prisma.listingSubcategory.upsert({
    where: {
      listingId_subcategoryId: {
        listingId: steadfastListing.id,
        subcategoryId: facilitiesSubcategory.id
      }
    },
    update: {},
    create: {
      listingId: steadfastListing.id,
      subcategoryId: facilitiesSubcategory.id
    }
  });

  await prisma.featuredSlot.upsert({
    where: {
      directoryId_tier_position: {
        directoryId: nycDirectory.id,
        tier: 'HERO',
        position: 1
      }
    },
    update: {
      listingId: listing.id
    },
    create: {
      directoryId: nycDirectory.id,
      listingId: listing.id,
      tier: 'HERO',
      position: 1,
      label: 'Editor pick'
    }
  });

  await prisma.featuredSlot.upsert({
    where: {
      directoryId_tier_position: {
        directoryId: nycDirectory.id,
        tier: 'PREMIUM',
        position: 1
      }
    },
    update: {
      listingId: harborListing.id,
      label: 'Tier-two highlight'
    },
    create: {
      directoryId: nycDirectory.id,
      listingId: harborListing.id,
      tier: 'PREMIUM',
      position: 1,
      label: 'Tier-two highlight'
    }
  });

  await prisma.featuredSlot.upsert({
    where: {
      directoryId_tier_position: {
        directoryId: nycDirectory.id,
        tier: 'PREMIUM',
        position: 2
      }
    },
    update: {
      listingId: steadfastListing.id,
      label: 'Tier-two highlight'
    },
    create: {
      directoryId: nycDirectory.id,
      listingId: steadfastListing.id,
      tier: 'PREMIUM',
      position: 2,
      label: 'Tier-two highlight'
    }
  });

  await prisma.llmFieldConfig.upsert({
    where: {
      targetType_fieldName_version: {
        targetType: 'LISTING',
        fieldName: 'ai_summary',
        version: 1
      }
    },
    update: {},
    create: {
      targetType: 'LISTING',
      fieldName: 'ai_summary',
      promptTemplate:
        'Summarize the business in 40 words, highlighting location coverage and specialties using second-person voice.',
      provider: 'openrouter',
      model: 'gpt-4o-mini',
      maxTokens: 160,
      temperature: 0.6,
      outputSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          tone: { type: 'string', enum: ['trusted', 'energetic', 'premium'] }
        },
        required: ['summary', 'tone']
      }
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
