import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sortListingsByScore,
  buildDirectoryGroups,
  buildDirectoryPath,
  buildDirectoryPagePath,
  buildDirectoryRouteConfig,
  buildSubcategoryPath,
  buildDirectorySubcategories,
  buildSubcategoryFilterNav,
  filterListingsBySubcategory,
  findDirectoryEntry,
  findDirectoryBySlug,
  findDirectoryBySubdirectory,
  getDirectorySubdirectorySlug,
  segmentFeaturedListings,
  resolveCategorySeoMetadata,
  buildDirectorySeoMetadata,
  buildDirectoryMapPins,
  shouldRenderDirectoryMap,
} from '../src/lib/directory-helpers.js';
import {
  matchSubdirectoryRequest,
  matchSubdomainRequest,
  buildDirectoryResponseTargets,
} from '../src/lib/directory-routing.js';
import { siteConfig } from '../src/config/site-config.js';

const sampleDirectories = [
  {
    slug: 'professional-services-new-york-city',
    subdomain: 'pros-nyc',
    subdirectory: 'professional-services/new-york-city',
    name: 'NYC Professional Services',
    locationAgnostic: false,
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
        coordinates: { latitude: 40.7038, longitude: -73.9903 },
        locationLabel: 'DUMBO, Brooklyn',
      },
      {
        slug: 'harbor-hvac',
        name: 'Harbor HVAC',
        score: 88.2,
        subcategories: ['HVAC'],
        latitude: 40.744,
        longitude: -73.948,
        locationLabel: 'Long Island City, Queens',
      },
      { slug: 'metro-clean', name: 'Metro Cleaners', score: undefined, subcategories: [] },
    ],
  },
  {
    slug: 'professional-services-denver',
    subdomain: 'pros-denver',
    subdirectory: 'professional-services/denver-co',
    name: 'Denver Professional Services',
    locationAgnostic: false,
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
        coordinates: { latitude: 39.7475, longitude: -104.998 },
      },
      {
        slug: 'riverfront-roofing',
        name: 'Riverfront Roofing',
        score: 85.7,
        subcategories: ['roofing'],
        coordinates: { latitude: 39.7577, longitude: -105.007 },
      },
    ],
  },
  {
    slug: 'jobs-new-york-city',
    subdomain: 'jobs-nyc',
    subdirectory: 'jobs/new-york-city',
    name: 'NYC Hiring Partners',
    locationAgnostic: true,
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
        coordinates: { latitude: 40.7426, longitude: -73.9878 },
      },
    ],
  },
];

const cloneDirectory = (directory) => ({
  ...directory,
  category: directory?.category ? { ...directory.category } : undefined,
  location: directory?.location ? { ...directory.location } : undefined,
});

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
    '/directories/professional-services/new-york-city'
  );
  assert.strictEqual(
    buildDirectoryPath('jobs', 'denver-co'),
    '/directories/jobs/denver-co'
  );
});

test('buildSubcategoryPath appends normalized subcategory segments', () => {
  assert.strictEqual(
    buildSubcategoryPath('professional-services', 'new-york-city', 'Electricians NYC!'),
    '/directories/professional-services/new-york-city/electricians-nyc'
  );
  assert.strictEqual(
    buildSubcategoryPath('jobs', 'denver-co'),
    '/directories/jobs/denver-co'
  );
});

test('buildSubcategoryPath accepts directory objects directly', () => {
  const directory = sampleDirectories[0];
  assert.strictEqual(
    buildSubcategoryPath(directory, 'hvac'),
    '/directories/professional-services/new-york-city/hvac'
  );
  assert.strictEqual(buildSubcategoryPath(directory), '/directories/professional-services/new-york-city');
});

test('getDirectorySubdirectorySlug + buildDirectoryPagePath respect overrides', () => {
  const directory = sampleDirectories[0];
  assert.strictEqual(getDirectorySubdirectorySlug(directory), 'professional-services/new-york-city');
  assert.strictEqual(buildDirectoryPagePath(directory), '/directories/professional-services/new-york-city');

  const fallback = buildDirectoryPagePath({
    category: { slug: 'jobs' },
    location: { slug: 'denver-co' },
  });
  assert.strictEqual(fallback, '/directories/jobs/denver-co');
});

test('buildDirectoryRouteConfig produces canonical + subdomain variants', () => {
  const routes = buildDirectoryRouteConfig(sampleDirectories[0]);
  assert.strictEqual(routes.subdirectory, '/directories/professional-services/new-york-city');
  assert.strictEqual(routes.subdomainHost, 'pros-nyc.megadirectory.local');
  assert.strictEqual(routes.subdomainUrl, 'https://pros-nyc.megadirectory.local');
  assert.strictEqual(routes.canonicalUrl, 'https://megadirectory.local/directories/professional-services/new-york-city');
});

test('buildDirectoryMapPins normalizes coordinates and rank order', () => {
  const pins = buildDirectoryMapPins(sampleDirectories[0]);
  assert.strictEqual(pins.length, 2, 'skips listings without coordinates');
  assert.deepStrictEqual(pins[0], {
    slug: 'bright-sparks',
    name: 'Bright Sparks Electric',
    latitude: 40.7038,
    longitude: -73.9903,
    locationLabel: 'DUMBO, Brooklyn',
    summary: undefined,
    url: undefined,
    rank: 1,
    score: 92.5,
  });
  assert.strictEqual(pins[1].slug, 'harbor-hvac');
  assert.strictEqual(pins[1].rank, 2, 'assigns incremental ranks');
});

test('buildDirectoryMapPins accepts listings override', () => {
  const listings = [
    {
      slug: 'custom-entry',
      name: 'Custom Entry',
      latitude: 39.75,
      longitude: -104.99,
      summary: 'Example',
    },
  ];
  const pins = buildDirectoryMapPins(sampleDirectories[1], listings);
  assert.strictEqual(pins.length, 1);
  assert.deepStrictEqual(pins[0], {
    slug: 'custom-entry',
    name: 'Custom Entry',
    latitude: 39.75,
    longitude: -104.99,
    locationLabel: 'Denver',
    summary: 'Example',
    url: undefined,
    rank: 1,
    score: undefined,
  });
});

test('shouldRenderDirectoryMap respects location-agnostic directories and coordinate presence', () => {
  const nyc = sampleDirectories[0];
  const pins = buildDirectoryMapPins(nyc);
  assert.ok(shouldRenderDirectoryMap(nyc, pins));

  const agnosticDirectory = sampleDirectories[2];
  assert.strictEqual(shouldRenderDirectoryMap(agnosticDirectory), false, 'location-agnostic hidden');

  const listingsWithoutCoords = nyc.listings.map((entry) => ({ ...entry, latitude: null, longitude: null, coordinates: null }));
  assert.strictEqual(
    shouldRenderDirectoryMap(nyc, buildDirectoryMapPins(nyc, listingsWithoutCoords)),
    false,
    'no pins when coordinates missing',
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
  assert.strictEqual(nycDirectory.routes.subdomainHost, 'pros-nyc.megadirectory.local');
  assert.ok(nycDirectory.routes.canonicalUrl.endsWith('/directories/professional-services/new-york-city'));
  assert.deepStrictEqual(nycDirectory.listings.map((listing) => listing.slug), [
    'bright-sparks',
    'harbor-hvac',
    'metro-clean',
  ]);

  const jobs = groups.find((group) => group.category.slug === 'jobs');
  assert.ok(jobs, 'jobs group present');
  assert.strictEqual(jobs.totalListings, 1);
  assert.strictEqual(jobs.locations.length, 1);
  assert.strictEqual(jobs.locations[0].directories[0].path, '/directories/jobs/new-york-city');
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
  assert.strictEqual(all.href, '/directories/professional-services/new-york-city');
  assert.ok(all.active === false);
  assert.strictEqual(all.count, 3);

  assert.strictEqual(hvac.href, '/directories/professional-services/new-york-city/hvac');
  assert.ok(hvac.active, 'HVAC entry active');
  assert.strictEqual(hvac.count, 2);

  assert.strictEqual(
    electricians.href,
    '/directories/professional-services/new-york-city/electricians',
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

test('findDirectoryBySlug performs case-insensitive lookups', () => {
  const match = findDirectoryBySlug(sampleDirectories, 'Professional-Services-New-York-City');
  assert.ok(match);
  assert.strictEqual(match.slug, 'professional-services-new-york-city');

  const missing = findDirectoryBySlug(sampleDirectories, 'unknown-slug');
  assert.strictEqual(missing, undefined);
});

test('findDirectoryBySubdirectory resolves nested path segments', () => {
  const match = findDirectoryBySubdirectory(sampleDirectories, 'professional-services/denver-co');
  assert.ok(match);
  assert.strictEqual(match.slug, 'professional-services-denver');

  const missing = findDirectoryBySubdirectory(sampleDirectories, 'jobs/denver-co');
  assert.strictEqual(missing, undefined);
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

test('buildDirectorySeoMetadata prioritizes directory overrides and normalizes keywords', () => {
  const directory = cloneDirectory(sampleDirectories[0]);
  Object.assign(directory, {
    metaTitle: '  Custom NYC Pros ',
    metaDescription: '  Tailored copy for editors ',
    metaKeywords: 'hvac, electricians , 24/7 dispatch ,',
    ogImageUrl: 'https://cdn.example.com/og/custom.png',
  });

  const result = buildDirectorySeoMetadata(directory);
  assert.strictEqual(result.title, 'Custom NYC Pros');
  assert.strictEqual(result.description, 'Tailored copy for editors');
  assert.strictEqual(result.keywords, 'hvac, electricians, 24/7 dispatch');
  assert.strictEqual(result.image, 'https://cdn.example.com/og/custom.png');
});

test('buildDirectorySeoMetadata falls back to hero subtitle and category metadata when overrides missing', () => {
  const directory = cloneDirectory(sampleDirectories[0]);
  Object.assign(directory, {
    metaTitle: '',
    title: '',
    metaDescription: '',
    metaKeywords: '',
    ogImageUrl: '',
    heroSubtitle: '  Rapid crews with on-call supervisors ',
  });
  directory.category.metaDescription = '';

  const result = buildDirectorySeoMetadata(directory);
  assert.strictEqual(result.title, 'Professional Services Directory · New York City');
  assert.strictEqual(result.description, 'Rapid crews with on-call supervisors');
  assert.strictEqual(result.keywords, null);
  assert.strictEqual(result.image, siteConfig.defaultOgImage);
});

test('matchSubdirectoryRequest returns normalized directory + optional subcategory', () => {
  const baseMatch = matchSubdirectoryRequest(
    sampleDirectories,
    '/directories/professional-services/new-york-city',
  );
  assert.ok(baseMatch);
  assert.strictEqual(baseMatch.directory.slug, 'professional-services-new-york-city');
  assert.strictEqual(baseMatch.subpath, '');
  assert.strictEqual(baseMatch.subcategorySlug, '');

  const subcategoryMatch = matchSubdirectoryRequest(
    sampleDirectories,
    '/directories/professional-services/new-york-city/hvac',
  );
  assert.ok(subcategoryMatch);
  assert.strictEqual(subcategoryMatch.directory.slug, 'professional-services-new-york-city');
  assert.strictEqual(subcategoryMatch.subpath, 'hvac');
  assert.strictEqual(subcategoryMatch.subcategorySlug, 'hvac');

  const missing = matchSubdirectoryRequest(sampleDirectories, '/directories/unknown/path');
  assert.strictEqual(missing, null);
});

test('matchSubdomainRequest resolves directory + subcategory from host', () => {
  const match = matchSubdomainRequest(
    sampleDirectories,
    'pros-nyc.megadirectory.local',
    '/HVAC',
  );
  assert.ok(match);
  assert.strictEqual(match.directory.slug, 'professional-services-new-york-city');
  assert.strictEqual(match.subpath, 'hvac');
  assert.strictEqual(match.subcategorySlug, 'hvac');

  const missing = matchSubdomainRequest(sampleDirectories, 'unknown.megadirectory.local', '/');
  assert.strictEqual(missing, null);
});

test('buildDirectoryResponseTargets appends subpath to all route variants', () => {
  const directory = sampleDirectories[0];
  const targets = buildDirectoryResponseTargets(directory, 'hvac');

  assert.strictEqual(
    targets.path,
    '/directories/professional-services/new-york-city/hvac',
  );
  assert.ok(
    targets.canonicalUrl.endsWith('/directories/professional-services/new-york-city/hvac'),
  );
  assert.strictEqual(
    targets.subdomainUrl,
    'https://pros-nyc.megadirectory.local/hvac',
  );
});
