const entries = require('../data/seoEntries');

function getSeoEntries() {
  return entries;
}

function updateSeoEntries(updates = []) {
  let applied = 0;

  updates.forEach((update) => {
    if (!update || !update.id) {
      return;
    }

    const entry = entries.find((item) => item.id === update.id);
    if (!entry) {
      return;
    }

    const nextTitle = normalizeString(update.metaTitle);
    const nextDescription = normalizeString(update.metaDescription);
    const hasTitleChange = typeof nextTitle === 'string' && nextTitle !== entry.metaTitle;
    const hasDescriptionChange =
      typeof nextDescription === 'string' && nextDescription !== entry.metaDescription;

    if (!hasTitleChange && !hasDescriptionChange) {
      return;
    }

    if (typeof nextTitle === 'string') {
      entry.metaTitle = nextTitle;
    }

    if (typeof nextDescription === 'string') {
      entry.metaDescription = nextDescription;
    }

    entry.lastUpdated = new Date().toISOString();
    applied += 1;
  });

  return applied;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : undefined;
}

module.exports = {
  getSeoEntries,
  updateSeoEntries,
};
