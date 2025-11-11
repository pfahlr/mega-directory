const express = require('express');
const { getSeoEntries, updateSeoEntries } = require('../services/seoService');

const router = express.Router();

router.get('/', (req, res) => {
  const entries = getSeoEntries();
  const categories = entries.filter((entry) => entry.type === 'category');
  const categoryLocations = entries.filter((entry) => entry.type === 'category_location');

  res.render('seo/index', {
    title: 'SEO Fields',
    categories,
    categoryLocations,
    totalEntries: entries.length,
    savedCount: parseCount(req.query.saved),
  });
});

router.post('/', (req, res) => {
  const updates = normalizeEntries(req.body.entries);
  const updated = updateSeoEntries(updates);

  res.redirect(`/seo?saved=${updated}`);
});

function normalizeEntries(entriesPayload) {
  if (!entriesPayload) {
    return [];
  }

  const records = Array.isArray(entriesPayload) ? entriesPayload : Object.values(entriesPayload);

  return records.map((record) => ({
    id: record.id,
    metaTitle: record.metaTitle?.trim() ?? '',
    metaDescription: record.metaDescription?.trim() ?? '',
  }));
}

function parseCount(value) {
  if (!value && value !== 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

module.exports = router;
