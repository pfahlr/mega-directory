const listings = require('../data/listings');

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'deactivated']);

function getListings() {
  return listings;
}

function updateListings(updates = []) {
  let applied = 0;

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
  });

  return applied;
}

module.exports = {
  getListings,
  updateListings,
};
