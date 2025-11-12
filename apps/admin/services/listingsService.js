const listings = require('../data/listings');
const apiClient = require('./apiClient');

const STATUS_PENDING = 'pending';
const STATUS_APPROVED = 'approved';
const STATUS_INACTIVE = 'inactive';
const STATUS_REJECTED = 'rejected';

const ALLOWED_STATUSES = new Set([
  STATUS_PENDING,
  STATUS_APPROVED,
  STATUS_INACTIVE,
  STATUS_REJECTED,
  'active',
  'deactivated'
]);
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 200;

function getListings({ page = 1, perPage = DEFAULT_PER_PAGE } = {}) {
  const normalizedPerPage = normalizePerPage(perPage);
  const total = listings.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / normalizedPerPage));
  const normalizedPage = normalizePage(page, totalPages);
  const startIndex = total === 0 ? 0 : (normalizedPage - 1) * normalizedPerPage;
  const endIndex = total === 0 ? 0 : Math.min(startIndex + normalizedPerPage, total);

  return {
    records: total === 0 ? [] : listings.slice(startIndex, endIndex),
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

    const index = listings.findIndex((item) => item.id === update.id);
    if (index === -1) {
      return;
    }

    const shouldPersist = update.shouldPersist !== false;

    if (!shouldPersist) {
      const [removed] = listings.splice(index, 1);
      if (removed) {
        removed.lastUpdated = new Date().toISOString();
        summary.removed += 1;
        apiPayload.push(serializeForApi({ ...removed, status: STATUS_REJECTED }));
      }
      return;
    }

    const listing = listings[index];

    if (typeof update.businessName === 'string') {
      const trimmed = update.businessName.trim();
      listing.businessName = trimmed || listing.businessName;
    }

    if (typeof update.website === 'string') {
      listing.website = update.website.trim();
    }

    if (typeof update.notes === 'string') {
      listing.notes = update.notes.trim();
    }

    const nextStatus = resolveStatus(update, listing.status);
    if (nextStatus) {
      listing.status = nextStatus;
    }

    listing.lastUpdated = new Date().toISOString();
    summary.saved += 1;
    apiPayload.push(serializeForApi(listing));
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

function resolveStatus(update, currentStatus) {
  if (typeof update.isActive === 'boolean') {
    return update.isActive ? STATUS_APPROVED : STATUS_INACTIVE;
  }

  if (typeof update.status === 'string') {
    const normalized = normalizeStatus(update.status);
    if (normalized) {
      return normalized;
    }
  }

  if (typeof currentStatus === 'string' && currentStatus.trim()) {
    return currentStatus;
  }

  return STATUS_PENDING;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'active') {
    return STATUS_APPROVED;
  }
  if (normalized === 'deactivated') {
    return STATUS_INACTIVE;
  }
  if (ALLOWED_STATUSES.has(normalized)) {
    return normalized;
  }

  return null;
}

function serializeForApi(listing) {
  return {
    id: listing.id,
    businessName: listing.businessName,
    website: listing.website,
    notes: listing.notes,
    status: (listing.status || STATUS_PENDING).toUpperCase(),
    lastUpdated: listing.lastUpdated
  };
}
