const fallbackListings = require('../data/listings');
const apiClient = require('./apiClient');

const STATUS_PENDING = 'PENDING';
const STATUS_APPROVED = 'APPROVED';
const STATUS_INACTIVE = 'INACTIVE';
const STATUS_REJECTED = 'REJECTED';

const STATUS_MAP = Object.freeze({
  pending: STATUS_PENDING,
  approved: STATUS_APPROVED,
  inactive: STATUS_INACTIVE,
  rejected: STATUS_REJECTED,
  active: STATUS_APPROVED,
  deactivated: STATUS_INACTIVE
});

const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 200;

async function getListings({ page = 1, perPage = DEFAULT_PER_PAGE } = {}) {
  const normalizedPerPage = normalizePerPage(perPage);
  const records = await fetchListingRecords();
  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / normalizedPerPage));
  const normalizedPage = normalizePage(page, totalPages);
  const startIndex = total === 0 ? 0 : (normalizedPage - 1) * normalizedPerPage;
  const endIndex = total === 0 ? 0 : Math.min(startIndex + normalizedPerPage, total);

  return {
    records: total === 0 ? [] : records.slice(startIndex, endIndex),
    total,
    page: normalizedPage,
    perPage: normalizedPerPage,
    totalPages,
    startIndex,
    endIndex
  };
}

async function updateListings(updates = []) {
  const summary = { saved: 0, removed: 0 };
  if (!Array.isArray(updates) || updates.length === 0) {
    return summary;
  }

  const apiPayload = [];

  updates.forEach((update) => {
    if (!update || !update.id) {
      return;
    }

    const shouldPersist = resolveShouldPersist(update);
    const status = determineStatus(update, shouldPersist);
    if (!status) {
      return;
    }

    if (shouldPersist) {
      summary.saved += 1;
    } else {
      summary.removed += 1;
    }

    apiPayload.push(buildApiPayload(update, status));
  });

  if (apiPayload.length > 0) {
    await apiClient.submitListingUpdates(apiPayload);
  }

  return summary;
}

module.exports = {
  getListings,
  updateListings,
  DEFAULT_PER_PAGE
};

async function fetchListingRecords() {
  try {
    const [listings, categories] = await Promise.all([
      apiClient.fetchListings(),
      apiClient.fetchCategories()
    ]);
    if (Array.isArray(listings)) {
      const categoryLookup = buildCategoryLookup(categories);
      return listings.map((record) => normalizeListingRecord(record, categoryLookup));
    }
  } catch (_error) {
    // Fall through and return fallback data.
  }
  return buildFallbackListings();
}

function buildCategoryLookup(categories) {
  const records = Array.isArray(categories) ? categories : [];
  const lookup = new Map();
  records.forEach((entry) => {
    if (entry && entry.id !== undefined) {
      lookup.set(entry.id, entry.name || `Category ${entry.id}`);
    }
  });
  return lookup;
}

function normalizeListingRecord(record, categoryLookup) {
  const status = typeof record?.status === 'string' ? record.status.toLowerCase() : 'pending';
  const categoryId =
    Array.isArray(record?.categoryIds) && record.categoryIds.length > 0 ? record.categoryIds[0] : null;
  const category = categoryId ? categoryLookup.get(categoryId) || `Category ${categoryId}` : 'Uncategorized';
  const address = Array.isArray(record?.addresses) ? record.addresses[0] : null;
  const locationParts = [];
  if (address?.city) {
    locationParts.push(address.city);
  }
  if (address?.region) {
    locationParts.push(address.region);
  }
  const locationLabel = locationParts.length > 0 ? locationParts.join(', ') : 'Location unknown';
  const scoreValue =
    typeof record?.score === 'number' && Number.isFinite(record.score) ? record.score : null;
  return {
    id: record?.id,
    businessName: record?.title || 'Untitled listing',
    website: record?.websiteUrl || '',
    summary: record?.summary || '',
    description: record?.description || '',
    notes: record?.notes || '',
    status,
    category,
    location: locationLabel,
    phone: record?.contactEmail || record?.sourceName || 'N/A',
    source: record?.sourceName || 'API',
    score: scoreValue,
    scoreLabel: scoreValue !== null ? `${scoreValue}/100` : 'N/A',
    submittedAt: record?.createdAt ?? null,
    lastUpdated: record?.updatedAt ?? null
  };
}

function buildFallbackListings() {
  return fallbackListings.map((entry) => {
    const scoreValue = typeof entry?.score === 'number' && Number.isFinite(entry.score) ? entry.score : null;
    return {
      id: entry.id,
      businessName: entry.businessName,
      website: entry.website,
      summary: entry.summary,
      description: entry.description || '',
      notes: entry.notes,
      status: typeof entry.status === 'string' ? entry.status.toLowerCase() : 'pending',
      category: entry.category ?? 'Uncategorized',
      location: entry.location ?? 'Location unknown',
      phone: entry.phone ?? 'N/A',
      source: entry.source ?? 'Import queue',
      score: scoreValue,
      scoreLabel: scoreValue !== null ? `${scoreValue}/100` : 'N/A',
      submittedAt: entry.submittedAt ?? null,
      lastUpdated: entry.lastUpdated ?? null
    };
  });
}

function buildApiPayload(update, status) {
  const payload = {
    id: update.id,
    status
  };

  if (typeof update.summary === 'string') {
    const trimmed = update.summary.trim();
    payload.summary = trimmed || null;
  }

  if (typeof update.description === 'string') {
    const trimmed = update.description.trim();
    payload.description = trimmed || null;
  }

  if (typeof update.businessName === 'string') {
    const trimmed = update.businessName.trim();
    if (trimmed) {
      payload.businessName = trimmed;
      payload.title = trimmed;
    }
  }

  if (typeof update.website === 'string') {
    const trimmed = update.website.trim();
    payload.website = trimmed || null;
  }

  if (typeof update.notes === 'string') {
    const trimmed = update.notes.trim();
    payload.notes = trimmed || null;
  }

  return payload;
}

function determineStatus(update, shouldPersist) {
  if (!shouldPersist) {
    return STATUS_REJECTED;
  }
  if (typeof update.isActive === 'boolean') {
    return update.isActive ? STATUS_APPROVED : STATUS_INACTIVE;
  }
  if (typeof update.status === 'string') {
    const normalized = normalizeStatus(update.status);
    if (normalized) {
      return normalized;
    }
  }
  return STATUS_PENDING;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return STATUS_MAP[normalized] || null;
}

function resolveShouldPersist(update) {
  if (!update) {
    return false;
  }
  const shouldPersistField =
    update.shouldPersist !== undefined ? update.shouldPersist : update.save;
  if (shouldPersistField === undefined) {
    return true;
  }
  return parseCheckbox(shouldPersistField);
}

function normalizePage(page, totalPages) {
  const parsed = Number(page);
  if (!Number.isFinite(parsed) || parsed <= 1) {
    return 1;
  }
  return Math.min(Math.trunc(parsed), totalPages);
}

function normalizePerPage(perPage) {
  const parsed = Number(perPage);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PER_PAGE;
  }
  return Math.min(Math.trunc(parsed), MAX_PER_PAGE);
}

function parseCheckbox(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => parseCheckbox(entry));
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'on' || normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return Boolean(value);
}
