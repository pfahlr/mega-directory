import { siteConfig } from '../config/site-config.js';

const FALLBACK_SCORE = -Infinity;
const DEFAULT_FEATURED_LIMIT = 3;
const FALLBACK_HERO_LABEL = 'Top pick';
const FALLBACK_TIER_TWO_LABEL = 'Tier-two highlight';
const FEATURED_TIER_ORDER = { HERO: 0, PREMIUM: 1, STANDARD: 2 };
const DEFAULT_DIRECTORY_NAME = 'Mega Directory';
const DEFAULT_CATEGORY_DESCRIPTION_TEMPLATE =
  'Discover curated NAME listings on Mega Directory.';
const directoryRouting = siteConfig.directoryRouting ?? {};
const SUBDIRECTORY_BASE = normalizeBasePath(directoryRouting.subdirectoryBase ?? '/directories');
const SUBDOMAIN_ROOT = sanitizeHostname(directoryRouting.subdomainRoot ?? siteConfig.canonicalHost ?? '');
const ROUTING_PROTOCOL = directoryRouting.protocol ?? 'https';
const PRIMARY_ROUTING_MODE =
  directoryRouting.primary === 'subdomain' ? 'subdomain' : 'subdirectory';
export const directoryRoutingSettings = {
  primaryMode: PRIMARY_ROUTING_MODE,
  subdirectoryBase: SUBDIRECTORY_BASE,
  subdomainRoot: SUBDOMAIN_ROOT,
  protocol: ROUTING_PROTOCOL,
};

function ensureLeadingSlash(value) {
  if (!value) {
    return '/';
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function normalizeBasePath(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '/directories';
  }
  return ensureLeadingSlash(trimmed.replace(/\/+$/, '')) || '/directories';
}

export function sanitizeHostname(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^(https?:)?\/\//, '')
    .replace(/\/.*$/, '');
  return normalized.replace(/[^a-z0-9.-]/g, '');
}

const normalizeScore = (value) =>
  typeof value === 'number' && Number.isFinite(value) ? value : FALLBACK_SCORE;

const normalizeSlug = (value, fallback = 'directory') => {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

export const normalizeSubdirectory = (value, fallback = 'directory') => {
  if (!value) {
    return fallback;
  }
  const normalized = String(value)
    .split('/')
    .map((segment) => normalizeSlug(segment, ''))
    .filter(Boolean)
    .join('/');
  return normalized || fallback;
};

const humanizeSlug = (value = '') =>
  String(value)
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || value;

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const sanitizeKeywords = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(', ');
};

const sanitizeUrl = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const getListingSlug = (listing) => normalizeSlug(listing?.slug ?? listing?.name, '');

const normalizeListingSubcategories = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const entry of entries) {
    let slug = '';
    let label = '';

    if (typeof entry === 'string') {
      slug = normalizeSlug(entry, '');
      label = humanizeSlug(slug || entry);
    } else if (entry && typeof entry === 'object') {
      slug = normalizeSlug(entry.slug ?? entry.name, '');
      label = entry.name ?? humanizeSlug(slug);
    }

    if (!slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    normalized.push({ slug, name: label || humanizeSlug(slug) });
  }

  return normalized;
};

const canonicalBaseUrl =
  siteConfig.canonicalUrl?.replace(/\/$/, '') ||
  (siteConfig.canonicalHost ? `${ROUTING_PROTOCOL}://${siteConfig.canonicalHost}` : '');

export function getDirectorySubdirectorySlug(directory) {
  if (!directory) {
    return 'directory';
  }

  if (directory.subdirectory) {
    return normalizeSubdirectory(directory.subdirectory);
  }

  if (directory.slug) {
    return normalizeSubdirectory(directory.slug);
  }

  const categorySlug = directory.category?.slug;
  const locationSlug = directory.location?.slug;
  if (categorySlug && locationSlug) {
    return normalizeSubdirectory(`${categorySlug}/${locationSlug}`);
  }

  const derived = [categorySlug, locationSlug].filter(Boolean).join('-');
  return normalizeSubdirectory(derived || directory.name);
}

const buildDirectorySubdomainHost = (directory) => {
  const slug = sanitizeHostname(directory?.subdomain);
  if (!slug || !SUBDOMAIN_ROOT) {
    return null;
  }
  return `${slug}.${SUBDOMAIN_ROOT}`;
};

export function buildDirectoryPagePath(directory) {
  const slug = getDirectorySubdirectorySlug(directory);
  const base = SUBDIRECTORY_BASE === '/' ? '' : SUBDIRECTORY_BASE;
  const combined = `${base}/${slug}`.replace(/\/{2,}/g, '/');
  return combined.startsWith('/') ? combined : `/${combined}`;
}

export function buildDirectoryRouteConfig(directory) {
  const subdirectory = buildDirectoryPagePath(directory);
  const subdomainHost = buildDirectorySubdomainHost(directory);
  const subdomainUrl = subdomainHost ? `${ROUTING_PROTOCOL}://${subdomainHost}` : null;
  const canonical =
    PRIMARY_ROUTING_MODE === 'subdomain' && subdomainUrl ? subdomainUrl : `${canonicalBaseUrl}${subdirectory}`;

  return {
    subdirectory,
    subdomainHost,
    subdomainUrl,
    canonicalUrl: canonical,
  };
}

export function findDirectoryBySlug(directories = [], slug) {
  if (!Array.isArray(directories) || !slug) {
    return undefined;
  }
  const normalized = normalizeSlug(slug);
  return directories.find((directory) => normalizeSlug(directory?.slug) === normalized);
}

export function findDirectoryBySubdirectory(directories = [], subdirectoryPath) {
  if (!Array.isArray(directories) || !subdirectoryPath) {
    return undefined;
  }
  const target = normalizeSubdirectory(subdirectoryPath);
  return directories.find(
    (directory) => getDirectorySubdirectorySlug(directory) === target,
  );
}

export function sortListingsByScore(listings = []) {
  if (!Array.isArray(listings)) {
    return [];
  }
  return [...listings].sort((a, b) => normalizeScore(b?.score) - normalizeScore(a?.score));
}

export function buildDirectoryPath(categoryOrDirectory, locationSlug) {
  if (categoryOrDirectory && typeof categoryOrDirectory === 'object') {
    return buildDirectoryPagePath(categoryOrDirectory);
  }

  if (!categoryOrDirectory || !locationSlug) {
    return SUBDIRECTORY_BASE;
  }

  const categorySegment = normalizeSlug(categoryOrDirectory);
  const locationSegment = normalizeSlug(locationSlug);
  const slug = `${categorySegment}/${locationSegment}`;
  return buildDirectoryPagePath({ subdirectory: slug });
}

export function buildSubcategoryPath(categoryOrDirectory, locationSlug, maybeSubcategory) {
  let directory;
  let subcategorySlug = maybeSubcategory;

  if (categoryOrDirectory && typeof categoryOrDirectory === 'object') {
    directory = categoryOrDirectory;
    subcategorySlug = locationSlug;
  } else {
    directory = { subdirectory: `${normalizeSlug(categoryOrDirectory)}/${normalizeSlug(locationSlug)}` };
  }

  const basePath = buildDirectoryPagePath(directory);
  if (!subcategorySlug) {
    return basePath;
  }

  const subcategorySegment = normalizeSlug(subcategorySlug);
  return `${basePath}/${subcategorySegment}`;
}

export function buildDirectoryGroups(directories = []) {
  if (!Array.isArray(directories) || directories.length === 0) {
    return [];
  }

  const categoryMap = new Map();

  for (const directory of directories) {
    if (!directory?.category?.slug || !directory?.location?.slug) {
      continue;
    }

    const categorySlug = normalizeSlug(directory.category.slug);
    const locationSlug = normalizeSlug(directory.location.slug);
    const listings = sortListingsByScore(directory.listings ?? []);

    const existingEntry = categoryMap.get(categorySlug);
    const mergedCategory = {
      ...(existingEntry?.category ?? {}),
      ...(directory.category ?? {}),
      slug: categorySlug,
    };
    const seoMetadata = resolveCategorySeoMetadata(mergedCategory);
    let categoryEntry = existingEntry;
    if (!categoryEntry) {
      categoryEntry = {
        category: { ...mergedCategory, ...seoMetadata },
        locations: [],
        totalListings: 0,
      };
      categoryMap.set(categorySlug, categoryEntry);
    } else {
      categoryEntry.category = { ...mergedCategory, ...seoMetadata };
    }

    let locationEntry = categoryEntry.locations.find(
      (entry) => entry.location.slug === locationSlug,
    );

    if (!locationEntry) {
      locationEntry = {
        location: { ...directory.location, slug: locationSlug },
        directories: [],
        totalListings: 0,
      };
      categoryEntry.locations.push(locationEntry);
    }

    const listingCount = listings.length;
    const averageScore =
      listingCount === 0
        ? 0
        : Number(
            (
              listings.reduce(
                (sum, listing) => sum + Math.max(normalizeScore(listing?.score), 0),
                0,
              ) / listingCount
            ).toFixed(1),
          );

    const routeConfig = buildDirectoryRouteConfig(directory);
    const directoryEntry = {
      ...directory,
      category: { ...directory.category, slug: categorySlug },
      location: { ...directory.location, slug: locationSlug },
      listings,
      path: routeConfig.subdirectory,
      routes: routeConfig,
      stats: {
        ...(directory.stats ?? {}),
        listingCount,
        averageScore,
        topScore: listings[0]?.score ?? null,
      },
    };

    locationEntry.directories.push(directoryEntry);
    locationEntry.totalListings += listingCount;
    categoryEntry.totalListings += listingCount;
  }

  const sortByName = (a, b) =>
    a.localeCompare(b, undefined, {
      sensitivity: 'base',
      numeric: true,
    });

  const sortLocations = (locations) =>
    locations
      .map((entry) => ({
        ...entry,
        directories: entry.directories.sort(
          (a, b) => (b.stats?.averageScore ?? 0) - (a.stats?.averageScore ?? 0),
        ),
      }))
      .sort((a, b) => sortByName(a.location.name, b.location.name));

  return Array.from(categoryMap.values())
    .map((entry) => ({
      ...entry,
      locations: sortLocations(entry.locations),
    }))
    .sort((a, b) => sortByName(a.category.name, b.category.name));
}

export function findDirectoryEntry(directories = [], categorySlug, locationSlug) {
  if (!Array.isArray(directories) || !categorySlug || !locationSlug) {
    return undefined;
  }

  const normalizedCategory = normalizeSlug(categorySlug);
  const normalizedLocation = normalizeSlug(locationSlug);

  return directories.find(
    (directory) =>
      normalizeSlug(directory?.category?.slug) === normalizedCategory &&
      normalizeSlug(directory?.location?.slug) === normalizedLocation,
  );
}

export function resolveCategorySeoMetadata(category = {}) {
  const name = sanitizeText(category?.name) || DEFAULT_DIRECTORY_NAME;
  const explicitTitle = sanitizeText(category?.metaTitle);
  const explicitDescription = sanitizeText(category?.metaDescription);
  const fallbackDescription =
    sanitizeText(category?.description) ||
    DEFAULT_CATEGORY_DESCRIPTION_TEMPLATE.replace('NAME', name);

  return {
    metaTitle: explicitTitle || name,
    metaDescription: explicitDescription || fallbackDescription,
  };
}

export function buildDirectorySeoMetadata(directory = {}) {
  const categorySeo = resolveCategorySeoMetadata(directory?.category ?? {});
  const locationName = sanitizeText(directory?.location?.name);
  const directoryTitle = sanitizeText(directory?.title);
  const explicitMetaTitle = sanitizeText(directory?.metaTitle);
  const derivedCategoryTitle = locationName
    ? `${categorySeo.metaTitle} · ${locationName}`
    : categorySeo.metaTitle;
  const resolvedTitle =
    explicitMetaTitle ||
    directoryTitle ||
    derivedCategoryTitle ||
    siteConfig.siteName ||
    DEFAULT_DIRECTORY_NAME;

  const explicitDescription = sanitizeText(directory?.metaDescription);
  const heroSubtitle = sanitizeText(directory?.heroSubtitle);
  const resolvedDescription =
    explicitDescription ||
    heroSubtitle ||
    categorySeo.metaDescription ||
    siteConfig.defaultDescription ||
    DEFAULT_CATEGORY_DESCRIPTION_TEMPLATE.replace('NAME', DEFAULT_DIRECTORY_NAME);

  const keywords = sanitizeKeywords(directory?.metaKeywords);
  const image =
    sanitizeUrl(directory?.ogImageUrl) ||
    sanitizeUrl(directory?.ogImage) ||
    sanitizeUrl(directory?.category?.ogImageUrl) ||
    sanitizeUrl(siteConfig.defaultOgImage);

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: keywords || null,
    image: image || null,
  };
}

export function buildDirectorySubcategories(directory) {
  if (!directory) {
    return [];
  }

  const declared = Array.isArray(directory.subcategories) ? directory.subcategories : [];
  const listings = Array.isArray(directory.listings) ? directory.listings : [];
  const map = new Map();

  for (const subcategory of declared) {
    const slug = normalizeSlug(subcategory?.slug ?? subcategory?.name, '');
    if (!slug) {
      continue;
    }
    map.set(slug, {
      slug,
      name: subcategory?.name ?? humanizeSlug(slug),
      description: subcategory?.description ?? '',
      listingCount: 0,
    });
  }

  for (const listing of listings) {
    const listingEntries = normalizeListingSubcategories(listing?.subcategories);
    for (const entry of listingEntries) {
      if (!map.has(entry.slug)) {
        map.set(entry.slug, {
          slug: entry.slug,
          name: entry.name ?? humanizeSlug(entry.slug),
          description: '',
          listingCount: 0,
        });
      }
      const target = map.get(entry.slug);
      target.listingCount += 1;
    }
  }

  return Array.from(map.values())
    .filter((entry) => entry.listingCount > 0)
    .sort((a, b) => {
      if (b.listingCount !== a.listingCount) {
        return b.listingCount - a.listingCount;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
}

export function filterListingsBySubcategory(listings = [], subcategorySlug) {
  const sortedListings = sortListingsByScore(listings);
  if (!subcategorySlug) {
    return sortedListings;
  }

  const normalizedSlug = normalizeSlug(subcategorySlug, '');
  if (!normalizedSlug) {
    return [];
  }

  return sortedListings.filter((listing) =>
    normalizeListingSubcategories(listing?.subcategories).some(
      (entry) => entry.slug === normalizedSlug,
    ),
  );
}

export function buildSubcategoryFilterNav(directory, activeSubcategory) {
  if (
    !directory?.category?.slug ||
    !directory?.location?.slug ||
    !Array.isArray(directory.listings)
  ) {
    return [];
  }

  const subcategories = buildDirectorySubcategories(directory);
  if (subcategories.length === 0) {
    return [];
  }

  const activeSlug = activeSubcategory ? normalizeSlug(activeSubcategory) : '';
  const basePath = buildDirectoryPagePath(directory);

  const filters = subcategories.map((subcategory) => ({
    slug: subcategory.slug,
    label: subcategory.name,
    description: subcategory.description,
    count: subcategory.listingCount,
    href: buildSubcategoryPath(directory, subcategory.slug),
    active: subcategory.slug === activeSlug,
  }));

  const baseFilter = {
    slug: null,
    label: 'All subcategories',
    description: 'Every listing in this directory.',
    count: directory.listings.length,
    href: basePath,
    active: !activeSlug,
  };

  return [baseFilter, ...filters];
}

export function segmentFeaturedListings(directory) {
  const sortedListings = sortListingsByScore(directory?.listings ?? []);
  const numericLimit = Number(directory?.featuredLimit);
  const featuredLimit =
    Number.isFinite(numericLimit) && numericLimit > 0
      ? Math.floor(numericLimit)
      : DEFAULT_FEATURED_LIMIT;

  if (sortedListings.length === 0) {
    return { hero: null, tierTwo: [], remainingListings: [] };
  }

  if (featuredLimit <= 0) {
    return { hero: null, tierTwo: [], remainingListings: sortedListings };
  }

  const listingMap = new Map();
  for (const listing of sortedListings) {
    const slug = getListingSlug(listing);
    if (slug && !listingMap.has(slug)) {
      listingMap.set(slug, listing);
    }
  }

  const potentialSlots = [];
  const seenSlotSlugs = new Set();
  const rawSlots = Array.isArray(directory?.featuredSlots) ? directory.featuredSlots : [];

  for (const rawSlot of rawSlots) {
    const normalizedSlot = normalizeFeaturedSlot(rawSlot);
    if (!normalizedSlot) {
      continue;
    }

    const listing = listingMap.get(normalizedSlot.slug);
    if (!listing || seenSlotSlugs.has(normalizedSlot.slug)) {
      continue;
    }

    seenSlotSlugs.add(normalizedSlot.slug);
    potentialSlots.push({ slot: normalizedSlot.slot, listing, slug: normalizedSlot.slug });
  }

  potentialSlots.sort((a, b) => {
    const tierRank =
      (FEATURED_TIER_ORDER[a.slot.tier] ?? FEATURED_TIER_ORDER.STANDARD) -
      (FEATURED_TIER_ORDER[b.slot.tier] ?? FEATURED_TIER_ORDER.STANDARD);
    if (tierRank !== 0) {
      return tierRank;
    }
    return a.slot.position - b.slot.position;
  });

  const usedSlugs = new Set();
  let hero = null;
  const heroSlot = potentialSlots.find((entry) => entry.slot.tier === 'HERO');
  if (heroSlot) {
    hero = { slot: heroSlot.slot, listing: heroSlot.listing };
    usedSlugs.add(heroSlot.slug);
  }

  if (!hero) {
    const fallbackHero = pickNextListing(sortedListings, usedSlugs);
    if (fallbackHero) {
      hero = {
        slot: { tier: 'HERO', position: 1, label: FALLBACK_HERO_LABEL },
        listing: fallbackHero.listing,
      };
      usedSlugs.add(fallbackHero.slug);
    }
  }

  let remainingCapacity = Math.max(featuredLimit - (hero ? 1 : 0), 0);
  const tierTwo = [];
  const premiumSlots = potentialSlots.filter(
    (entry) => entry.slot.tier === 'PREMIUM' && !usedSlugs.has(entry.slug)
  );

  for (const entry of premiumSlots) {
    if (remainingCapacity === 0) {
      break;
    }
    tierTwo.push({ slot: entry.slot, listing: entry.listing });
    usedSlugs.add(entry.slug);
    remainingCapacity -= 1;
  }

  if (remainingCapacity > 0 && tierTwo.length === 0) {
    tierTwo.push(
      ...fallbackTierTwo(sortedListings, usedSlugs, remainingCapacity, tierTwo.length)
    );
  }

  const remainingListings = sortedListings.filter((listing) => {
    const slug = getListingSlug(listing);
    return !slug || !usedSlugs.has(slug);
  });

  return { hero, tierTwo, remainingListings };
}

const toFiniteCoordinate = (value) => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  return typeof numeric === 'number' && Number.isFinite(numeric) ? numeric : null;
};

export function buildDirectoryMapPins(directory, listingsOverride) {
  const listings = Array.isArray(listingsOverride)
    ? listingsOverride
    : Array.isArray(directory?.listings)
      ? directory.listings
      : [];

  if (!listings.length) {
    return [];
  }

  const fallbackLocationLabel = sanitizeText(directory?.location?.name) || '';
  const pins = [];
  let rank = 1;

  for (const listing of listings) {
    if (!listing) {
      continue;
    }

    const lat = toFiniteCoordinate(listing?.coordinates?.latitude ?? listing?.latitude);
    const lon = toFiniteCoordinate(listing?.coordinates?.longitude ?? listing?.longitude);
    if (lat === null || lon === null) {
      continue;
    }

    const slug = getListingSlug(listing);
    if (!slug) {
      continue;
    }

    pins.push({
      slug,
      name: sanitizeText(listing?.name) || humanizeSlug(slug),
      latitude: lat,
      longitude: lon,
      locationLabel: sanitizeText(listing?.locationLabel) || fallbackLocationLabel,
      summary: listing?.summary,
      url: listing?.url,
      rank,
      score:
        typeof listing?.score === 'number' && Number.isFinite(listing.score)
          ? Number(listing.score)
          : undefined,
    });
    rank += 1;
  }

  return pins;
}

export function shouldRenderDirectoryMap(directory, pinsOverride) {
  if (!directory || directory.locationAgnostic) {
    return false;
  }

  const pins =
    pinsOverride ?? (Array.isArray(directory.listings) ? buildDirectoryMapPins(directory) : []);
  return pins.length > 0;
}

function normalizeFeaturedSlot(slot) {
  if (!slot) {
    return null;
  }

  const tier = typeof slot?.tier === 'string' ? slot.tier.trim().toUpperCase() : '';
  if (tier !== 'HERO' && tier !== 'PREMIUM') {
    return null;
  }

  const slugCandidate =
    slot?.listingSlug ?? slot?.slug ?? slot?.listing?.slug ?? slot?.listing?.name ?? '';
  const slug = normalizeSlug(slugCandidate, '');
  if (!slug) {
    return null;
  }

  const position = Number.isInteger(slot?.position) && slot.position > 0 ? slot.position : 1;
  const labelSource = typeof slot?.label === 'string' ? slot.label.trim() : '';
  const label = labelSource || (tier === 'HERO' ? FALLBACK_HERO_LABEL : FALLBACK_TIER_TWO_LABEL);

  return {
    slug,
    slot: {
      tier,
      position,
      label,
    },
  };
}

function pickNextListing(listings, usedSlugs) {
  for (const listing of listings) {
    const slug = getListingSlug(listing);
    if (!slug || usedSlugs.has(slug)) {
      continue;
    }
    return { listing, slug };
  }
  return null;
}

function fallbackTierTwo(listings, usedSlugs, remainingCapacity, existingCount) {
  const entries = [];
  let position = existingCount + 1;

  while (remainingCapacity > 0) {
    const fallback = pickNextListing(listings, usedSlugs);
    if (!fallback) {
      break;
    }

    entries.push({
      slot: {
        tier: 'PREMIUM',
        position,
        label: FALLBACK_TIER_TWO_LABEL,
      },
      listing: fallback.listing,
    });
    usedSlugs.add(fallback.slug);
    remainingCapacity -= 1;
    position += 1;
  }

  return entries;
}
