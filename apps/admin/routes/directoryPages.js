const express = require('express');

const {
  getDirectoryPages,
  getDirectoryOptions,
  createDirectoryPage,
  updateDirectoryPages
} = require('../services/directoryPageService');

const router = express.Router();

router.get('/', (req, res) => {
  const savedCount = parseCount(req.query.saved);
  const createdCount = parseCount(req.query.created);
  const viewModel = buildViewModel({ savedCount, createdCount });

  res.render('directory-pages/index', {
    ...viewModel,
    active: 'directory-pages'
  });
});

router.post('/', (req, res) => {
  const intent = req.body?.intent;
  if (intent === 'create') {
    return handleCreate(req, res);
  }
  return handleBulkUpdate(req, res);
});

function handleCreate(req, res) {
  const payload = req.body?.newPage || {};
  const result = createDirectoryPage(payload);
  if (result.errors) {
    const viewModel = buildViewModel({
      creationErrors: result.errors,
      creationDraft: buildCreationDraft(payload)
    });

    return res.status(400).render('directory-pages/index', {
      ...viewModel,
      active: 'directory-pages'
    });
  }

  return res.redirect('/directory-pages?created=1');
}

function handleBulkUpdate(req, res) {
  const updates = normalizePagesPayload(req.body?.pages);
  const result = updateDirectoryPages(updates);

  if (result.errors) {
    const viewModel = buildViewModel({
      updateErrors: result.errors,
      savedCount: result.updated
    });

    return res.status(400).render('directory-pages/index', {
      ...viewModel,
      active: 'directory-pages'
    });
  }

  return res.redirect(`/directory-pages${buildSavedQuery(result.updated)}`);
}

function buildSavedQuery(saved) {
  if (!Number.isFinite(saved) || saved <= 0) {
    return '';
  }
  const params = new URLSearchParams({ saved });
  return `?${params.toString()}`;
}

function normalizePagesPayload(payload) {
  if (!payload) {
    return [];
  }

  const entries = Array.isArray(payload) ? payload : Object.values(payload);
  return entries
    .map((entry) => entry || {})
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      categoryId: entry.categoryId,
      locationId: entry.locationId,
      locationAgnostic: entry.locationAgnostic,
      subdomain: entry.subdomain,
      subdirectory: entry.subdirectory,
      heroTitle: entry.heroTitle,
      heroSubtitle: entry.heroSubtitle,
      introMarkdown: entry.introMarkdown,
      metaTitle: entry.metaTitle,
      metaDescription: entry.metaDescription,
      metaKeywords: entry.metaKeywords,
      ogImageUrl: entry.ogImageUrl,
      save: entry.save,
      deactivate: entry.deactivate
    }));
}

function buildViewModel({ savedCount = null, createdCount = null, creationErrors = null, creationDraft = null, updateErrors = null } = {}) {
  const options = getDirectoryOptions();
  return {
    title: 'Directory Page Builder',
    pages: getDirectoryPages(),
    categories: options.categories,
    locations: options.locations,
    statuses: options.statuses,
    savedCount,
    createdCount,
    creationErrors,
    creationDraft,
    updateErrors
  };
}

function parseCount(value) {
  if (value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildCreationDraft(payload = {}) {
  return {
    title: payload.title || '',
    categoryId: payload.categoryId || '',
    locationId: payload.locationId || '',
    locationAgnostic: parseCheckbox(payload.locationAgnostic),
    subdomain: payload.subdomain || '',
    subdirectory: payload.subdirectory || '',
    heroTitle: payload.heroTitle || '',
    heroSubtitle: payload.heroSubtitle || '',
    introMarkdown: payload.introMarkdown || '',
    metaTitle: payload.metaTitle || '',
    metaDescription: payload.metaDescription || '',
    metaKeywords: payload.metaKeywords || '',
    ogImageUrl: payload.ogImageUrl || ''
  };
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

module.exports = router;
