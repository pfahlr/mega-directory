const express = require('express');

const {
  getDirectoryPages,
  getDirectoryOptions,
  getDirectoryPage,
  createDirectoryPage,
  updateDirectoryPage,
  deleteDirectoryPage,
  STATUSES
} = require('../services/directoryPageService');

const router = express.Router();
const PAGE_SIZE = 10;

router.get('/', async (req, res, next) => {
  try {
    const options = await getDirectoryOptions();
    res.render('directory-pages/create', buildCreateViewModel(options, {
      createdCount: parseCount(req.query.created),
      creationDraft: buildEmptyDraft(),
      creationErrors: null,
      active: 'directory-pages'
    }));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body?.newPage || {};
    const result = await createDirectoryPage(payload);
    if (result.errors) {
      const options = await getDirectoryOptions();
      return res.status(400).render(
        'directory-pages/create',
        buildCreateViewModel(options, {
          creationErrors: result.errors,
          creationDraft: result.draft || payload,
          active: 'directory-pages'
        })
      );
    }
    return res.redirect('/directory-pages?created=1');
  } catch (error) {
    next(error);
  }
});

router.get('/manage', async (req, res, next) => {
  try {
    const page = parsePage(req.query.page);
    const { records, pagination } = await getDirectoryPages({ page, perPage: PAGE_SIZE });
    res.render('directory-pages/manage', {
      title: 'Manage Directory Pages',
      directories: records,
      pagination,
      updatedCount: parseCount(req.query.updated),
      deletedCount: parseCount(req.query.deleted),
      active: 'directory-pages'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:directoryId/edit', async (req, res, next) => {
  try {
    const directoryId = parseIdParam(req.params.directoryId);
    if (!directoryId) {
      return res.status(404).render('errors/not-found', {
        title: 'Directory not found'
      });
    }
    const [directory, options] = await Promise.all([
      getDirectoryPage(directoryId),
      getDirectoryOptions()
    ]);
    res.render('directory-pages/edit', {
      title: `Edit ${directory.title}`,
      directory,
      categories: options.categories,
      locations: options.locations,
      statuses: options.statuses,
      formErrors: null,
      draft: buildEditDraft(directory),
      savedCount: parseCount(req.query.saved),
      active: 'directory-pages'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:directoryId/edit', async (req, res, next) => {
  try {
    const directoryId = parseIdParam(req.params.directoryId);
    if (!directoryId) {
      return res.status(404).render('errors/not-found', { title: 'Directory not found' });
    }
    const payload = req.body?.directory || req.body || {};
    const result = await updateDirectoryPage(directoryId, payload);
    if (result.errors) {
      const [directory, options] = await Promise.all([
        getDirectoryPage(directoryId),
        getDirectoryOptions()
      ]);
      return res.status(400).render('directory-pages/edit', {
        title: `Edit ${directory.title}`,
        directory,
        categories: options.categories,
        locations: options.locations,
        statuses: options.statuses,
        formErrors: result.errors,
        draft: result.draft || payload,
        savedCount: null,
        active: 'directory-pages'
      });
    }
    return res.redirect(`/directory-pages/${directoryId}/edit?saved=1`);
  } catch (error) {
    next(error);
  }
});

router.post('/:directoryId/delete', async (req, res, next) => {
  try {
    const directoryId = parseIdParam(req.params.directoryId);
    if (!directoryId) {
      return res.status(404).render('errors/not-found', { title: 'Directory not found' });
    }
    await deleteDirectoryPage(directoryId);
    return res.redirect('/directory-pages/manage?deleted=1');
  } catch (error) {
    next(error);
  }
});

function buildCreateViewModel(options, { createdCount = null, creationErrors = null, creationDraft = null, active = 'directory-pages' } = {}) {
  return {
    title: 'Directory Page Builder',
    categories: options.categories,
    locations: options.locations,
    statuses: options.statuses,
    createdCount,
    creationErrors,
    creationDraft: creationDraft || buildEmptyDraft(),
    active
  };
}

function buildEmptyDraft() {
  return {
    title: '',
    categoryId: '',
    locationId: '',
    locationAgnostic: false,
    subdomain: '',
    subdirectory: '',
    heroTitle: '',
    heroSubtitle: '',
    introMarkdown: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogImageUrl: '',
    status: STATUSES[0]
  };
}

function buildEditDraft(record) {
  return {
    title: record.title || '',
    categoryId: record.categoryId
      ? String(record.categoryId)
      : record.category?.id
        ? String(record.category.id)
        : '',
    locationId: record.locationAgnostic
      ? ''
      : record.locationId
        ? String(record.locationId)
        : record.location?.slug || '',
    locationAgnostic: Boolean(record.locationAgnostic),
    subdomain: record.subdomain || '',
    subdirectory: record.subdirectory || '',
    heroTitle: record.heroTitle || '',
    heroSubtitle: record.heroSubtitle || '',
    introMarkdown: record.introMarkdown || '',
    metaTitle: record.metaTitle || '',
    metaDescription: record.metaDescription || '',
    metaKeywords: record.metaKeywords || '',
    ogImageUrl: record.ogImageUrl || '',
    status: record.status || STATUSES[0]
  };
}

function parsePage(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.trunc(parsed);
}

function parseCount(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseIdParam(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function paginateRecords(records, page, perPage) {
  const totalItems = records.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 1) / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalItems);
  return {
    records: records.slice(startIndex, endIndex),
    meta: {
      totalItems,
      totalPages,
      page: safePage,
      perPage,
      hasPrevious: safePage > 1,
      hasNext: safePage < totalPages,
      previousPage: safePage > 1 ? safePage - 1 : null,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      start: totalItems === 0 ? 0 : startIndex + 1,
      end: totalItems === 0 ? 0 : endIndex
    }
  };
}

module.exports = router;
