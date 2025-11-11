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

    if (typeof update.metaTitle === 'string') {
      entry.metaTitle = update.metaTitle.trim();
    }

    if (typeof update.metaDescription === 'string') {
      entry.metaDescription = update.metaDescription.trim();
    }

    entry.lastUpdated = new Date().toISOString();
    applied += 1;
  });

  return applied;
}

module.exports = {
  getSeoEntries,
  updateSeoEntries,
};
