const listings = require('../data/listings');
const apiClient = require('./apiClient');

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'deactivated']);
const DEFAULT_PER_PAGE = 50;
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
  let applied = 0;
  const apiPayload = [];

  updates.forEach((update) => {
    if (!update || !update.id) {
      return;
    }

    const listing = listings.find((item) => item.id === update.id);
    if (!listing) {
      return;
    }

    if (typeof update.businessName === 'string') {
      listing.businessName = update.businessName.trim() || listing.businessName;
    }

    if (typeof update.website === 'string') {
      listing.website = update.website.trim();
    }

    if (typeof update.notes === 'string') {
      listing.notes = update.notes.trim();
    }

    if (ALLOWED_STATUSES.has(update.status)) {
      listing.status = update.status;
    }

    listing.lastUpdated = new Date().toISOString();
    applied += 1;
    apiPayload.push({
      id: listing.id,
      businessName: listing.businessName,
      website: listing.website,
      notes: listing.notes,
      status: listing.status,
      lastUpdated: listing.lastUpdated
    });
  });

  if (apiPayload.length > 0) {
    await apiClient.submitListingUpdates(apiPayload);
  }

  return applied;
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
