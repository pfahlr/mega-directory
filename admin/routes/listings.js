const express = require('express');
const { getListings, updateListings } = require('../services/listingsService');

const router = express.Router();

router.get('/', (req, res) => {
  const page = parsePage(req.query.page);
  const result = getListings({ page });

  res.render('listings/index', {
    title: 'Listing Review',
    listings: result.records,
    savedCount: parseCount(req.query.saved),
    pagination: buildPagination(result)
  });
});

router.post('/', async (req, res, next) => {
  try {
    const updates = normalizePayload(req.body.listings);
    const updated = await updateListings(updates);
    const page = parsePage(req.body?.page);

    res.redirect(`/listings${buildRedirectQuery({ page, saved: updated })}`);
  } catch (error) {
    next(error);
  }
});

function normalizePayload(payload) {
  if (!payload) {
    return [];
  }

  const records = Array.isArray(payload) ? payload : Object.values(payload);

  return records.map((record) => {
    const normalized = record ?? {};
    const shouldSave = parseCheckbox(normalized.save);
    const shouldDeactivate = parseCheckbox(normalized.deactivate);
    return {
      id: normalized.id,
      businessName: normalized.businessName?.trim() ?? '',
      website: normalized.website?.trim() ?? '',
      notes: normalized.notes?.trim() ?? '',
      status: deriveStatus(normalized.status, shouldSave, shouldDeactivate)
    };
  });
}

function parseCount(value) {
  if (!value && value !== 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePage(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.trunc(parsed);
}

function buildPagination(result) {
  const totalItems = result?.total ?? 0;
  const page = result?.page ?? 1;
  const perPage = result?.perPage ?? (result?.records?.length ?? 0) || 1;
  const totalPages = result?.totalPages ?? 1;
  const hasRecords = Boolean(result?.records && result.records.length > 0 && totalItems > 0);
  const startIndex = hasRecords ? result.startIndex ?? 0 : 0;
  const endIndex = hasRecords ? startIndex + result.records.length : 0;

  return {
    totalItems,
    totalPages,
    page,
    perPage,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
    previousPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
    start: hasRecords ? startIndex + 1 : 0,
    end: hasRecords ? endIndex : 0
  };
}

function buildRedirectQuery({ page, saved }) {
  const params = new URLSearchParams();
  if (Number.isFinite(page) && page > 1) {
    params.set('page', page);
  }

  params.set('saved', saved);

  const query = params.toString();
  return query ? `?${query}` : '';
}

function deriveStatus(currentStatus, shouldSave, shouldDeactivate) {
  if (shouldDeactivate) {
    return 'deactivated';
  }
  if (shouldSave) {
    return 'approved';
  }

  if (typeof currentStatus === 'string' && currentStatus.trim()) {
    return currentStatus.trim();
  }

  return 'pending';
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

module.exports = router;
