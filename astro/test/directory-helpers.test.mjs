import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sortListingsByScore,
  buildDirectoryGroups,
  buildDirectoryPath,
  buildSubcategoryPath,
  buildDirectorySubcategories,
  buildSubcategoryFilterNav,
  filterListingsBySubcategory,
  findDirectoryEntry,
  segmentFeaturedListings,
  resolveCategorySeoMetadata,
} from '../src/lib/directory-helpers.js';

const sampleDirectories = [
  {
    slug: 'professional-services-new-york-city',
    name: 'NYC Professional Services',
    category: {
      slug: 'professional-services',
      name: 'Professional Services',
      description: 'Verified pros for commercial and residential requests.',
      metaTitle: 'Professional Services Directory',
      metaDescription: 'Curated electricians, HVAC teams, and facility crews.',
    },
    location: { slug: 'new-york-city', name: 'New York City', region: 'NY' },
    heroTitle: 'Trusted Pros in NYC',
    heroSubtitle: 'Browse curated electricians, plumbers, HVAC, and more.',
    featuredLimit: 3,
    featuredSlots: [
      {
        tier: 'HERO',
        position: 1,
        label: 'Editor pick',
        listingSlug: 'bright-sparks',
      },
      {
        tier: 'PREMIUM',
        position: 1,
        label: 'Tier-two highlight',
        listingSlug: 'harbor-hvac',
      },
    ],
    subcategories: [
      { slug: 'electricians', name: 'Electricians' },
      { slug: 'hvac', name: 'HVAC' },
      { slug: 'maintenance-crews', name: 'Maintenance Crews' },
    ],
    listings: [
      {
        slug: 'bright-sparks',
        name: 'Bright Sparks Electric',
        score: 92.5,
        subcategories: ['electricians', 'hvac'],
      },
      {
        slug: 'harbor-hvac',
        name: 'Harbor HVAC',
        score: 88.2,
        subcategories: ['HVAC'],
      },
      { slug: 'metro-clean', name: 'Metro Cleaners', score: undefined, subcategories: [] },
    ],
  },
  {
    slug: 'professional-services-denver',
    name: 'Denver Professional Services',
    category: {
      slug: 'professional-services',
      name: 'Professional Services',
      description: 'Verified pros for commercial and residential requests.',
      metaTitle: 'Professional Services Directory',
      metaDescription: 'Curated electricians, HVAC teams, and facility crews.',
    },
    location: { slug: 'denver-co', name: 'Denver', region: 'CO' },
    heroTitle: 'Mile High Maintainers',
    heroSubtitle: 'Regional trades and contractors with transparent SLAs.',
    featuredLimit: 2,
    listings: [
      {
        slug: 'mile-high-plumbing',
        name: 'Mile High Plumbing',
        score: 81.4,
        subcategories: ['plumbing'],
      },
      {
        slug: 'riverfront-roofing',
        name: 'Riverfront Roofing',
        score: 85.7,
        subcategories: ['roofing'],
      },
    ],
  },
  {
    slug: 'jobs-new-york-city',
    name: 'NYC Hiring Partners',
    category: {
      slug: 'jobs',
      name: 'Jobs',
      description: 'Recruiting partners and curated job boards.',
    },
    location: { slug: 'new-york-city', name: 'New York City', region: 'NY' },
    heroTitle: 'Recruiting in NYC',
    heroSubtitle: 'Specialists for finance, media, and tech roles.',
    featuredLimit: 1,
    listings: [
      {
        slug: 'fifth-avenue-search',
        name: 'Fifth Avenue Search',
        score: 78,
        subcategories: ['executive-search'],
      },
    ],
  },
];

test('sortListingsByScore orders items descending without mutating input', () => {
  const original = sampleDirectories[0].listings;
  const sorted = sortListingsByScore(original);

  assert.deepStrictEqual(sorted.map((item) => item.slug), [
    'bright-sparks',
    'harbor-hvac',
    'metro-clean',
  ]);
  assert.notStrictEqual(sorted, original);
  assert.deepStrictEqual(
    original.map((item) => item.slug),
    ['bright-sparks', 'harbor-hvac', 'metro-clean'],
    'original reference order preserved'
  );
});

test('buildDirectoryPath composes canonical slug-based URLs', () => {
  assert.strictEqual(
    buildDirectoryPath('professional-services', 'new-york-city'),
    '/listings/professional-services/new-york-city'
  );
  assert.strictEqual(
    buildDirectoryPath('jobs', 'denver-co'),
    '/listings/jobs/denver-co'
  );
});

test('buildSubcategoryPath appends normalized subcategory segments', () => {
  assert.strictEqual(
    buildSubcategoryPath('professional-services', 'new-york-city', 'Electricians NYC!'),
    '/listings/professional-services/new-york-city/electricians-nyc'
  );
  assert.strictEqual(
    buildSubcategoryPath('jobs', 'denver-co'),
    '/listings/jobs/denver-co'
  );
});

test('buildDirectoryGroups nests directories under categories and locations with stats', () => {
  const groups = buildDirectoryGroups(sampleDirectories);

  assert.strictEqual(groups.length, 2, 'two category buckets returned');

  const services = groups.find((group) => group.category.slug === 'professional-services');
  assert.ok(services, 'professional services group present');
  assert.strictEqual(services.totalListings, 5);
  assert.strictEqual(services.locations.length, 2);
  assert.strictEqual(services.category.metaTitle, 'Professional Services Directory');
  assert.strictEqual(
    services.category.metaDescription,
    'Curated electricians, HVAC teams, and facility crews.'
  );

  const nyc = services.locations.find((loc) => loc.location.slug === 'new-york-city');
  assert.ok(nyc, 'NYC location bucket present');
  assert.strictEqual(nyc.totalListings, 3);
  assert.strictEqual(nyc.directories.length, 1);

  const [nycDirectory] = nyc.directories;
  assert.strictEqual(
    nycDirectory.path,
    buildDirectoryPath('professional-services', 'new-york-city')
  );
  assert.deepStrictEqual(nycDirectory.listings.map((listing) => listing.slug), [
    'bright-sparks',
    'harbor-hvac',
    'metro-clean',
  ]);

  const jobs = groups.find((group) => group.category.slug === 'jobs');
  assert.ok(jobs, 'jobs group present');
  assert.strictEqual(jobs.totalListings, 1);
  assert.strictEqual(jobs.locations.length, 1);
  assert.strictEqual(jobs.locations[0].directories[0].path, '/listings/jobs/new-york-city');
  assert.strictEqual(jobs.category.metaTitle, 'Jobs');
  assert.strictEqual(
    jobs.category.metaDescription,
    'Recruiting partners and curated job boards.'
  );
});

test('buildDirectorySubcategories aggregates metadata and listing counts', () => {
  const directory = sampleDirectories[0];
  const subcategories = buildDirectorySubcategories(directory);

  assert.deepStrictEqual(
    subcategories.map((entry) => entry.slug),
    ['hvac', 'electricians'],
    'only subcategories with listings are returned sorted by count'
  );

  const hvac = subcategories.find((entry) => entry.slug === 'hvac');
  assert.ok(hvac);
  assert.strictEqual(hvac.listingCount, 2);
  assert.strictEqual(hvac.name, 'HVAC');

  const electricians = subcategories.find((entry) => entry.slug === 'electricians');
  assert.ok(electricians);
  assert.strictEqual(electricians.listingCount, 1);
});

test('buildSubcategoryFilterNav returns all filter options with active state', () => {
  const directory = sampleDirectories[0];
  const nav = buildSubcategoryFilterNav(directory, 'HVAC');

  assert.strictEqual(nav.length, 3, 'includes base + two subcategories');

  const [all, hvac, electricians] = nav;
  assert.strictEqual(all.href, '/listings/professional-services/new-york-city');
  assert.ok(all.active === false);
  assert.strictEqual(all.count, 3);

  assert.strictEqual(hvac.href, '/listings/professional-services/new-york-city/hvac');
  assert.ok(hvac.active, 'HVAC entry active');
  assert.strictEqual(hvac.count, 2);

  assert.strictEqual(
    electricians.href,
    '/listings/professional-services/new-york-city/electricians',
  );
  assert.ok(!electricians.active);
});

test('filterListingsBySubcategory reduces results to a matching slug', () => {
  const listings = sampleDirectories[0].listings;

  const hvac = filterListingsBySubcategory(listings, 'HVAC');
  assert.deepStrictEqual(
    hvac.map((listing) => listing.slug),
    ['bright-sparks', 'harbor-hvac'],
    'returns only hvac listings sorted by score'
  );

  const electricians = filterListingsBySubcategory(listings, 'electricians');
  assert.deepStrictEqual(
    electricians.map((listing) => listing.slug),
    ['bright-sparks'],
    'single electrician listing returned'
  );

  assert.deepStrictEqual(filterListingsBySubcategory(listings, 'unknown'), [], 'unknown slug empty');
  assert.deepStrictEqual(
    filterListingsBySubcategory(listings).map((listing) => listing.slug),
    ['bright-sparks', 'harbor-hvac', 'metro-clean'],
    'no slug returns all sorted listings'
  );
});

test('findDirectoryEntry returns a directory when slugs match regardless of casing', () => {
  const match = findDirectoryEntry(sampleDirectories, 'Professional-Services', 'NEW-YORK-CITY');
  assert.ok(match, 'expected directory entry for NYC professional services');
  assert.strictEqual(match.slug, 'professional-services-new-york-city');

  const missing = findDirectoryEntry(sampleDirectories, 'jobs', 'denver-co');
  assert.strictEqual(missing, undefined);
});

test('segmentFeaturedListings returns hero + tier-two slots with remaining listings pruned', () => {
  const result = segmentFeaturedListings(sampleDirectories[0]);

  assert.ok(result.hero, 'hero slot should resolve');
  assert.strictEqual(result.hero.listing.slug, 'bright-sparks');
  assert.strictEqual(result.hero.slot.label, 'Editor pick');
  assert.strictEqual(result.hero.slot.tier, 'HERO');

  assert.strictEqual(result.tierTwo.length, 1, 'one tier-two slot resolved');
  assert.strictEqual(result.tierTwo[0].listing.slug, 'harbor-hvac');
  assert.strictEqual(result.tierTwo[0].slot.tier, 'PREMIUM');

  assert.deepStrictEqual(
    result.remainingListings.map((listing) => listing.slug),
    ['metro-clean'],
    'remaining listings exclude featured ones'
  );
});

test('segmentFeaturedListings falls back to score-ordered listings respecting featuredLimit', () => {
  const result = segmentFeaturedListings(sampleDirectories[1]);

  assert.ok(result.hero, 'fallback hero should exist');
  assert.strictEqual(result.hero.listing.slug, 'riverfront-roofing');
  assert.strictEqual(result.hero.slot.tier, 'HERO');
  assert.strictEqual(result.hero.slot.label, 'Top pick');

  assert.strictEqual(result.tierTwo.length, 1, 'limit of 2 leaves 1 tier-two slot');
  assert.strictEqual(result.tierTwo[0].listing.slug, 'mile-high-plumbing');
  assert.strictEqual(result.tierTwo[0].slot.tier, 'PREMIUM');

  assert.deepStrictEqual(result.remainingListings, [], 'all listings consumed when under limit');
});

test('resolveCategorySeoMetadata trims values and applies layered fallbacks', () => {
  const explicit = resolveCategorySeoMetadata({
    name: ' Professional Services ',
    description: ' Verified crews ',
    metaTitle: '  Elite Services  ',
    metaDescription: '  All the best teams  ',
  });
  assert.deepStrictEqual(explicit, {
    metaTitle: 'Elite Services',
    metaDescription: 'All the best teams',
  });

  const fallbackFromDescription = resolveCategorySeoMetadata({
    name: 'Jobs',
    description: 'Recruiting partners and curated job boards.',
  });
  assert.strictEqual(fallbackFromDescription.metaTitle, 'Jobs');
  assert.strictEqual(
    fallbackFromDescription.metaDescription,
    'Recruiting partners and curated job boards.'
  );

  const defaultFallback = resolveCategorySeoMetadata({});
  assert.strictEqual(defaultFallback.metaTitle, 'Mega Directory');
  assert.strictEqual(
    defaultFallback.metaDescription,
    'Discover curated Mega Directory listings on Mega Directory.'
  );
});
