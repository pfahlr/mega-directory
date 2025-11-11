const express = require('express');
const { getListings, updateListings } = require('../services/listingsService');

const router = express.Router();

router.get('/', (req, res) => {
  const listings = getListings();

  res.render('listings/index', {
    title: 'Listing Review',
    listings,
    savedCount: parseCount(req.query.saved),
  });
});

router.post('/', (req, res) => {
  const updates = normalizePayload(req.body.listings);
  const updated = updateListings(updates);

  res.redirect(`/listings?saved=${updated}`);
});

function normalizePayload(payload) {
  if (!payload) {
    return [];
  }

  const records = Array.isArray(payload) ? payload : Object.values(payload);

  return records.map((record) => ({
    id: record.id,
    businessName: record.businessName?.trim() ?? '',
    website: record.website?.trim() ?? '',
    notes: record.notes?.trim() ?? '',
    status: record.status ?? 'pending',
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
