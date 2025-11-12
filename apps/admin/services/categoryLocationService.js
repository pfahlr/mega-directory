const approvedLocations = require('../data/categoryLocations');
const pendingLocations = require('../data/categoryLocationDiscoveries');

function getPendingCategoryLocations() {
  return pendingLocations.slice();
}

function getApprovedCategoryLocations() {
  return approvedLocations.slice();
}

function approveCategoryLocations(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { added: 0 };
  }

  const approvals = candidates.filter((candidate) => candidate?.id && candidate.approve);
  if (approvals.length === 0) {
    return { added: 0 };
  }

  const approvedSlugs = new Set(
    approvedLocations.filter((entry) => entry?.slug).map((entry) => entry.slug)
  );

  let added = 0;

  approvals.forEach(({ id }) => {
    const index = pendingLocations.findIndex((entry) => entry.id === id);
    if (index === -1) {
      return;
    }

    const pendingEntry = pendingLocations[index];
    if (!pendingEntry?.slug || approvedSlugs.has(pendingEntry.slug)) {
      return;
    }

    const approvedRecord = {
      id: pendingEntry.id,
      category: pendingEntry.category,
      location: pendingEntry.location,
      slug: pendingEntry.slug,
      listingsCount: normalizeListingsCount(pendingEntry.listingsCount),
      source: pendingEntry.source ?? null,
      notes: typeof pendingEntry.notes === 'string' ? pendingEntry.notes : '',
      sampleListings: Array.isArray(pendingEntry.sampleListings)
        ? pendingEntry.sampleListings.slice(0, 5)
        : [],
      discoveredAt: pendingEntry.discoveredAt ?? null,
      approvedAt: new Date().toISOString(),
      status: 'active'
    };

    pendingLocations.splice(index, 1);
    approvedLocations.push(approvedRecord);
    approvedSlugs.add(approvedRecord.slug);
    added += 1;
  });

  return { added };
}

function normalizeListingsCount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.trunc(parsed);
}

module.exports = {
  getPendingCategoryLocations,
  getApprovedCategoryLocations,
  approveCategoryLocations
};
