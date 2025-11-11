const FALLBACK_SCORE = -Infinity;
const DEFAULT_FEATURED_LIMIT = 3;
const FALLBACK_HERO_LABEL = 'Top pick';
const FALLBACK_TIER_TWO_LABEL = 'Tier-two highlight';
const FEATURED_TIER_ORDER = { HERO: 0, PREMIUM: 1, STANDARD: 2 };
const DEFAULT_DIRECTORY_NAME = 'Mega Directory';
const DEFAULT_CATEGORY_DESCRIPTION_TEMPLATE =
  'Discover curated NAME listings on Mega Directory.';

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

const humanizeSlug = (value = '') =>
  String(value)
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || value;

const sanitizeText = (value) => (typeof value === 'string' ? value.trim() : '');

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

export function sortListingsByScore(listings = []) {
  if (!Array.isArray(listings)) {
    return [];
  }
  return [...listings].sort((a, b) => normalizeScore(b?.score) - normalizeScore(a?.score));
}

export function buildDirectoryPath(categorySlug, locationSlug) {
  if (!categorySlug || !locationSlug) {
    return '/listings';
  }

  const categorySegment = normalizeSlug(categorySlug);
  const locationSegment = normalizeSlug(locationSlug);

  return `/listings/${categorySegment}/${locationSegment}`;
}

export function buildSubcategoryPath(categorySlug, locationSlug, subcategorySlug) {
  if (!subcategorySlug) {
    return buildDirectoryPath(categorySlug, locationSlug);
  }

  const basePath = buildDirectoryPath(categorySlug, locationSlug);
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

    const directoryEntry = {
      ...directory,
      category: { ...directory.category, slug: categorySlug },
      location: { ...directory.location, slug: locationSlug },
      listings,
      path: buildDirectoryPath(categorySlug, locationSlug),
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

  const normalizedCategory = normalizeSlug(directory.category.slug);
  const normalizedLocation = normalizeSlug(directory.location.slug);
  const activeSlug = activeSubcategory ? normalizeSlug(activeSubcategory) : '';

  const filters = subcategories.map((subcategory) => ({
    slug: subcategory.slug,
    label: subcategory.name,
    description: subcategory.description,
    count: subcategory.listingCount,
    href: buildSubcategoryPath(normalizedCategory, normalizedLocation, subcategory.slug),
    active: subcategory.slug === activeSlug,
  }));

  const baseFilter = {
    slug: null,
    label: 'All subcategories',
    description: 'Every listing in this directory.',
    count: directory.listings.length,
    href: buildDirectoryPath(normalizedCategory, normalizedLocation),
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
