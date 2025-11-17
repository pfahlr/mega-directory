const express = require('express');
const { getListings, updateListings } = require('../services/listingsService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const result = await getListings({ page });

    res.render('listings/index', {
      title: 'Listing Review',
      listings: result.records,
      savedCount: parseCount(req.query.saved),
      removedCount: parseCount(req.query.removed),
      pagination: buildPagination(result)
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const updates = normalizePayload(req.body.listings);
    const updated = await updateListings(updates);
    const page = parsePage(req.body?.page);

    res.redirect(
      `/listings${buildRedirectQuery({
        page,
        saved: updated?.saved ?? 0,
        removed: updated?.removed ?? 0
      })}`
    );
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
    const shouldPersistField =
      normalized.saved !== undefined ? normalized.saved : normalized.save;
    const shouldPersist =
      shouldPersistField === undefined ? true : parseCheckbox(shouldPersistField);
    const isActive =
      normalized.active !== undefined
        ? parseCheckbox(normalized.active)
        : normalized.deactivate !== undefined
          ? !parseCheckbox(normalized.deactivate)
          : undefined;

    return {
      id: normalized.id,
      businessName: normalized.businessName?.trim() ?? '',
      website: normalized.website?.trim() ?? '',
      notes: normalized.notes?.trim() ?? '',
      shouldPersist,
      isActive: typeof isActive === 'boolean' ? isActive : undefined
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
  const resolvedPerPage = result?.perPage ?? (result?.records?.length ?? 0);
  const perPage = resolvedPerPage || 1;
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

function buildRedirectQuery({ page, saved, removed }) {
  const params = new URLSearchParams();
  if (Number.isFinite(page) && page > 1) {
    params.set('page', page);
  }

  if (Number.isFinite(saved) && saved > 0) {
    params.set('saved', saved);
  }
  if (Number.isFinite(removed) && removed > 0) {
    params.set('removed', removed);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
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
