import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureDemoGeography() {
  const unitedStates = await prisma.country.upsert({
    where: { id: 233 },
    update: {
      name: 'United States',
      iso2: 'US',
      iso3: 'USA',
      numericCode: '840',
      phoneCode: '+1',
      capital: 'Washington D.C.',
      currency: 'USD',
      currencyName: 'United States dollar',
      currencySymbol: '$',
      region: 'Americas',
      subregion: 'Northern America',
      timezones: [
        {
          zoneName: 'America/New_York',
          gmtOffset: -18000,
          gmtOffsetName: 'UTC-05:00',
          abbreviation: 'EST',
          tzName: 'Eastern Standard Time'
        }
      ],
      translations: {}
    },
    create: {
      id: 233,
      name: 'United States',
      iso2: 'US',
      iso3: 'USA',
      numericCode: '840',
      phoneCode: '+1',
      capital: 'Washington D.C.',
      currency: 'USD',
      currencyName: 'United States dollar',
      currencySymbol: '$',
      tld: '.us',
      nativeName: 'United States',
      region: 'Americas',
      subregion: 'Northern America',
      timezones: [
        {
          zoneName: 'America/New_York',
          gmtOffset: -18000,
          gmtOffsetName: 'UTC-05:00',
          abbreviation: 'EST',
          tzName: 'Eastern Standard Time'
        }
      ],
      translations: {},
      latitude: 38.893838,
      longitude: -77.15466,
      emoji: '🇺🇸',
      emojiU: 'U+1F1FA U+1F1F8',
      hasStates: true,
      hasPostalCodes: true
    }
  });

  const newYorkState = await prisma.stateProvince.upsert({
    where: { id: 3930 },
    update: {
      name: 'New York',
      stateCode: 'NY',
      countryId: unitedStates.id,
      countryCode: 'US'
    },
    create: {
      id: 3930,
      name: 'New York',
      stateCode: 'NY',
      type: 'state',
      latitude: 43.2994285,
      longitude: -74.2179326,
      countryId: unitedStates.id,
      countryCode: 'US'
    }
  });

  const californiaState = await prisma.stateProvince.upsert({
    where: { id: 3876 },
    update: {
      name: 'California',
      stateCode: 'CA',
      countryId: unitedStates.id,
      countryCode: 'US'
    },
    create: {
      id: 3876,
      name: 'California',
      stateCode: 'CA',
      type: 'state',
      latitude: 36.778261,
      longitude: -119.4179324,
      countryId: unitedStates.id,
      countryCode: 'US'
    }
  });

  const nycCity = await prisma.city.upsert({
    where: { id: 5128581 },
    update: {
      name: 'New York City',
      asciiName: 'New York',
      countryId: unitedStates.id,
      countryCode: 'US',
      stateId: newYorkState.id,
      stateCode: 'NY',
      stateName: 'New York'
    },
    create: {
      id: 5128581,
      name: 'New York City',
      asciiName: 'New York',
      latitude: 40.7127753,
      longitude: -74.0059728,
      timezone: 'America/New_York',
      wikiDataId: 'Q60',
      stateId: newYorkState.id,
      stateCode: 'NY',
      stateName: 'New York',
      countryId: unitedStates.id,
      countryCode: 'US'
    }
  });

  const sfCity = await prisma.city.upsert({
    where: { id: 5391959 },
    update: {
      name: 'San Francisco',
      asciiName: 'San Francisco',
      countryId: unitedStates.id,
      countryCode: 'US',
      stateId: californiaState.id,
      stateCode: 'CA',
      stateName: 'California'
    },
    create: {
      id: 5391959,
      name: 'San Francisco',
      asciiName: 'San Francisco',
      latitude: 37.7749295,
      longitude: -122.4194155,
      timezone: 'America/Los_Angeles',
      wikiDataId: 'Q62',
      stateId: californiaState.id,
      stateCode: 'CA',
      stateName: 'California',
      countryId: unitedStates.id,
      countryCode: 'US'
    }
  });

  const nycPostal = await prisma.postalCode.upsert({
    where: {
      countryId_code_placeName: {
        countryId: unitedStates.id,
        code: '10004',
        placeName: 'New York City'
      }
    },
    update: {
      stateId: newYorkState.id,
      cityId: nycCity.id
    },
    create: {
      code: '10004',
      placeName: 'New York City',
      countryId: unitedStates.id,
      countryCode: 'US',
      stateId: newYorkState.id,
      stateCode: 'NY',
      stateName: 'New York',
      cityId: nycCity.id,
      latitude: 40.6884,
      longitude: -74.017,
      accuracy: 1
    }
  });

  const sfPostal = await prisma.postalCode.upsert({
    where: {
      countryId_code_placeName: {
        countryId: unitedStates.id,
        code: '94105',
        placeName: 'San Francisco'
      }
    },
    update: {
      stateId: californiaState.id,
      cityId: sfCity.id
    },
    create: {
      code: '94105',
      placeName: 'San Francisco',
      countryId: unitedStates.id,
      countryCode: 'US',
      stateId: californiaState.id,
      stateCode: 'CA',
      stateName: 'California',
      cityId: sfCity.id,
      latitude: 37.7898,
      longitude: -122.3942,
      accuracy: 1
    }
  });

  return {
    country: unitedStates,
    states: {
      ny: newYorkState,
      ca: californiaState
    },
    cities: {
      nyc: nycCity,
      sf: sfCity
    },
    postalCodes: {
      nyc: nycPostal,
      sf: sfPostal
    }
  };
}

type CategoryLinkInput = {
  categoryId: number;
  isPrimary?: boolean;
};

type ListingAddressInput = {
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
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  postalCodeId?: number | null;
};

async function setListingCategories(listingId: number, categories: CategoryLinkInput[]) {
  await prisma.listingCategory.deleteMany({ where: { listingId } });
  if (categories.length === 0) {
    return;
  }
  await prisma.listingCategory.createMany({
    data: categories.map((entry, index) => ({
      listingId,
      categoryId: entry.categoryId,
      isPrimary: entry.isPrimary ?? index === 0
    }))
  });
}

async function setListingAddresses(listingId: number, addresses: ListingAddressInput[]) {
  await prisma.listingAddress.deleteMany({ where: { listingId } });
  if (addresses.length === 0) {
    return;
  }
  await prisma.listingAddress.createMany({
    data: addresses.map((address, index) => ({
      listingId,
      label: address.label ?? (index === 0 ? 'Primary' : null),
      addressLine1: address.addressLine1 ?? null,
      addressLine2: address.addressLine2 ?? null,
      city: address.city ?? null,
      region: address.region ?? null,
      postalCode: address.postalCode ?? null,
      country: address.country ?? 'US',
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      isPrimary: address.isPrimary ?? index === 0,
      countryId: address.countryId ?? null,
      stateId: address.stateId ?? null,
      cityId: address.cityId ?? null,
      postalCodeId: address.postalCodeId ?? null
    }))
  });
}

async function main() {
  const geography = await ensureDemoGeography();
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
    update: {
      state: 'NY',
      country: 'US',
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id,
      postalCodeId: geography.postalCodes.nyc.id
    },
    create: {
      name: 'New York City',
      slug: 'new-york-city',
      state: 'NY',
      country: 'US',
      timezone: 'America/New_York',
      latitude: 40.7128,
      longitude: -74.006,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id,
      postalCodeId: geography.postalCodes.nyc.id
    }
  });

  const sf = await prisma.location.upsert({
    where: { slug: 'san-francisco' },
    update: {
      state: 'CA',
      country: 'US',
      timezone: 'America/Los_Angeles',
      latitude: 37.7749,
      longitude: -122.4194,
      countryId: geography.country.id,
      stateId: geography.states.ca.id,
      cityId: geography.cities.sf.id,
      postalCodeId: geography.postalCodes.sf.id
    },
    create: {
      name: 'San Francisco',
      slug: 'san-francisco',
      state: 'CA',
      country: 'US',
      timezone: 'America/Los_Angeles',
      latitude: 37.7749,
      longitude: -122.4194,
      countryId: geography.country.id,
      stateId: geography.states.ca.id,
      cityId: geography.cities.sf.id,
      postalCodeId: geography.postalCodes.sf.id
    }
  });

  const nycDirectoryData = {
    title: 'NYC Professional Services',
    slug: 'professional-services-new-york-city',
    subdomain: 'services.nyc',
    subdirectory: 'professional-services/new-york-city',
    hostname: 'services.nyc.example.com',
    heroTitle: 'Trusted Pros in New York City',
    heroSubtitle: 'Browse curated electricians, plumbers, HVAC, and more.',
    status: 'ACTIVE' as const,
    isActive: true,
    metaTitle: 'Professional Services in NYC',
    metaDescription: 'Hand-reviewed professional services in the five boroughs.',
    metaKeywords: 'electricians,hvac,maintenance,new york',
    ogImageUrl: 'https://cdn.example.com/directories/pro-services-nyc.png',
    locationAgnostic: false,
    categoryId: servicesCategory.id,
    locationId: nyc.id
  };

  const nycDirectory = await prisma.directory.upsert({
    where: { slug: nycDirectoryData.slug },
    update: nycDirectoryData,
    create: nycDirectoryData
  });

  const sfDirectoryData = {
    title: 'SF Professional Services',
    slug: 'professional-services-san-francisco',
    subdomain: 'services.sf',
    subdirectory: 'professional-services/san-francisco',
    hostname: 'services.sf.example.com',
    heroTitle: 'Bay Area Specialists',
    heroSubtitle: 'Top-rated maintainers for your next remodel or repair.',
    status: 'DRAFT' as const,
    isActive: false,
    metaTitle: 'Professional Services in SF',
    metaDescription: 'Hand-reviewed professional services across the Bay Area.',
    metaKeywords: 'electricians,hvac,maintenance,san francisco',
    ogImageUrl: 'https://cdn.example.com/directories/pro-services-sf.png',
    locationAgnostic: false,
    categoryId: servicesCategory.id,
    locationId: sf.id
  };

  await prisma.directory.upsert({
    where: { slug: sfDirectoryData.slug },
    update: sfDirectoryData,
    create: sfDirectoryData
  });

  const nycJobsDirectoryData = {
    title: 'NYC Jobs Directory',
    slug: 'jobs-new-york-city',
    subdomain: 'jobs.nyc',
    subdirectory: 'jobs/new-york-city',
    hostname: 'jobs.nyc.example.com',
    heroTitle: 'Hiring in NYC',
    heroSubtitle: 'Recruiting partners for finance, media, and tech.',
    status: 'DRAFT' as const,
    isActive: false,
    metaTitle: 'NYC Jobs & Recruiters',
    metaDescription: 'Recruiting firms and boards focused on New York City talent.',
    metaKeywords: 'jobs,recruiting,new york city',
    ogImageUrl: 'https://cdn.example.com/directories/jobs-nyc.png',
    locationAgnostic: false,
    categoryId: jobsCategory.id,
    locationId: nyc.id
  };

  await prisma.directory.upsert({
    where: { slug: nycJobsDirectoryData.slug },
    update: nycJobsDirectoryData,
    create: nycJobsDirectoryData
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
      locationId: nyc.id,
      directoryId: nycDirectory.id,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id,
      postalCodeId: geography.postalCodes.nyc.id
    }
  });

  await setListingCategories(listing.id, [
    { categoryId: servicesCategory.id, isPrimary: true },
    { categoryId: jobsCategory.id }
  ]);

  await setListingAddresses(listing.id, [
    {
      label: 'Manhattan HQ',
      addressLine1: '45 Water Street',
      city: 'New York',
      region: 'NY',
      postalCode: '10004',
      country: 'US',
      isPrimary: true,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id,
      postalCodeId: geography.postalCodes.nyc.id
    },
    {
      label: 'Midtown Satellite',
      addressLine1: '135 W 50th Street',
      city: 'New York',
      region: 'NY',
      postalCode: '10020',
      country: 'US',
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id
    }
  ]);

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
      locationId: nyc.id,
      directoryId: nycDirectory.id,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id,
      postalCodeId: geography.postalCodes.nyc.id
    }
  });

  await setListingCategories(harborListing.id, [
    { categoryId: servicesCategory.id, isPrimary: true }
  ]);

  await setListingAddresses(harborListing.id, [
    {
      label: 'Financial District Office',
      addressLine1: '140 Broadway',
      city: 'New York',
      region: 'NY',
      postalCode: '10005',
      country: 'US',
      isPrimary: true,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id
    }
  ]);

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
      locationId: nyc.id,
      directoryId: nycDirectory.id,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id,
      postalCodeId: geography.postalCodes.nyc.id
    }
  });

  await setListingCategories(steadfastListing.id, [
    { categoryId: servicesCategory.id, isPrimary: true }
  ]);

  await setListingAddresses(steadfastListing.id, [
    {
      label: 'Uptown Service Center',
      addressLine1: '200 W 67th Street',
      city: 'New York',
      region: 'NY',
      postalCode: '10023',
      country: 'US',
      isPrimary: true,
      countryId: geography.country.id,
      stateId: geography.states.ny.id,
      cityId: geography.cities.nyc.id
    }
  ]);

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
