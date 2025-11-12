const express = require('express');
const {
  getPendingCategoryLocations,
  getApprovedCategoryLocations,
  approveCategoryLocations
} = require('../services/categoryLocationService');

const router = express.Router();

router.get('/', (req, res) => {
  const pending = getPendingCategoryLocations();
  const approved = getApprovedCategoryLocations();

  res.render('category-locations/index', {
    title: 'Category & Location Approvals',
    pending,
    totalApproved: approved.length,
    addedCount: parseCount(req.query.added)
  });
});

router.post('/', (req, res, next) => {
  try {
    const approvals = normalizeCandidates(req.body?.candidates);
    const result = approveCategoryLocations(approvals);

    res.redirect(`/category-locations${buildRedirectQuery(result.added)}`);
  } catch (error) {
    next(error);
  }
});

function normalizeCandidates(payload) {
  if (!payload) {
    return [];
  }

  const records = Array.isArray(payload) ? payload : Object.values(payload);
  return records
    .map((record) => ({
      id: typeof record.id === 'string' ? record.id : null,
      approve: parseCheckbox(record.approve)
    }))
    .filter((record) => record.id);
}

function parseCheckbox(value) {
  if (Array.isArray(value)) {
    return value.some((entry) => parseCheckbox(entry));
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'on' || normalized === 'yes';
  }

  return Boolean(value);
}

function parseCount(value) {
  if (!value && value !== 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function buildRedirectQuery(added) {
  const parsed = Number(added);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return '';
  }

  const params = new URLSearchParams();
  params.set('added', parsed);
  const query = params.toString();
  return query ? `?${query}` : '';
}

module.exports = router;
