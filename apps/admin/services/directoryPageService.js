const apiClient = require('./apiClient');
const directoryOptions = require('../data/directoryPageOptions');

const STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'];

async function getDirectoryOptions() {
  const categories = await apiClient.fetchCategories();
  return {
    categories: categories.map((category) => ({
      id: category.id,
      label: category.name || `Category ${category.id}`
    })),
    locations: directoryOptions.locations.slice(),
    statuses: STATUSES.slice()
  };
}

async function getDirectoryPages({ page, perPage } = {}) {
  const [response, options] = await Promise.all([
    apiClient.fetchDirectories({ page, limit: perPage }),
    getDirectoryOptions()
  ]);
  const records = (Array.isArray(response?.data) ? response.data : []).map((entry) =>
    decorateDirectory(entry, options)
  );
  const pagination = buildPagination(response?.meta, records.length, perPage);
  return { records, pagination };
}

async function getDirectoryPage(directoryId) {
  const [record, options] = await Promise.all([apiClient.fetchDirectory(directoryId), getDirectoryOptions()]);
  return decorateDirectory(record, options);
}

async function createDirectoryPage(payload = {}) {
  const normalized = normalizeDirectoryPayload(payload, { mode: 'create' });
  if (normalized.errors) {
    return { errors: normalized.errors, draft: normalized.draft };
  }
  try {
    const record = await apiClient.createDirectory(normalized.payload);
    return { record, errors: null };
  } catch (error) {
    if (error instanceof apiClient.ApiClientError && (error.status === 400 || error.code === 'VALIDATION_ERROR')) {
      return { errors: buildApiErrorBag(error), draft: normalized.draft };
    }
    throw error;
  }
}

async function updateDirectoryPage(directoryId, payload = {}) {
  const normalized = normalizeDirectoryPayload(payload, { mode: 'update' });
  if (normalized.errors) {
    return { errors: normalized.errors, draft: normalized.draft };
  }
  try {
    const record = await apiClient.updateDirectory(directoryId, normalized.payload);
    return { record, errors: null };
  } catch (error) {
    if (error instanceof apiClient.ApiClientError && (error.status === 400 || error.code === 'VALIDATION_ERROR')) {
      return { errors: buildApiErrorBag(error), draft: normalized.draft };
    }
    throw error;
  }
}

async function deleteDirectoryPage(directoryId) {
  await apiClient.deleteDirectory(directoryId);
}

function normalizeDirectoryPayload(payload = {}, { mode } = {}) {
  const errors = {};
  const draft = buildDraft(payload);

  const normalized = {
    title: typeof payload.title === 'string' ? payload.title.trim() : '',
    slug: '',
    subdomain: sanitizeSubdomain(payload.subdomain),
    subdirectory: sanitizeSubdirectory(payload.subdirectory),
    heroTitle: typeof payload.heroTitle === 'string' ? payload.heroTitle.trim() : '',
    heroSubtitle: typeof payload.heroSubtitle === 'string' ? payload.heroSubtitle.trim() : '',
    introMarkdown: typeof payload.introMarkdown === 'string' ? payload.introMarkdown.trim() : '',
    metaTitle: typeof payload.metaTitle === 'string' ? payload.metaTitle.trim() : '',
    metaDescription: typeof payload.metaDescription === 'string' ? payload.metaDescription.trim() : '',
    metaKeywords: collapseSpaces(payload.metaKeywords || ''),
    ogImageUrl: typeof payload.ogImageUrl === 'string' ? payload.ogImageUrl.trim() : '',
    status: normalizeStatus(payload.status, mode === 'create' ? 'DRAFT' : undefined),
    locationAgnostic: parseCheckbox(payload.locationAgnostic),
    categoryId: null,
    locationId: null
  };

  normalized.slug = normalized.subdirectory ? buildSlug(normalized.subdirectory) : buildSlug(normalized.title);

  const categoryId = parseCategoryId(payload.categoryId);
  if (!categoryId) {
    errors.categoryId = 'Select a category';
  } else {
    normalized.categoryId = categoryId;
  }

  if (!normalized.locationAgnostic) {
    const locationId = parseLocationId(payload.locationId);
    if (!locationId) {
      errors.locationId = 'Select a location';
    } else {
      normalized.locationId = locationId;
    }
  } else {
    normalized.locationId = null;
  }

  if (!normalized.title) {
    errors.title = 'Title is required';
  }
  if (!normalized.subdomain) {
    errors.subdomain = 'Subdomain is required';
  }
  if (!normalized.subdirectory) {
    errors.subdirectory = 'Subdirectory is required';
  }
  if (!normalized.metaTitle) {
    errors.metaTitle = 'Meta title is required';
  }
  if (!normalized.metaDescription) {
    errors.metaDescription = 'Meta description is required';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, draft };
  }

  return { payload: normalized, errors: null, draft };
}

function buildDraft(payload = {}) {
  return {
    title: typeof payload.title === 'string' ? payload.title.trim() : '',
    categoryId: typeof payload.categoryId === 'string' ? payload.categoryId.trim() : payload.categoryId || '',
    locationId: typeof payload.locationId === 'string' ? payload.locationId.trim() : payload.locationId || '',
    locationAgnostic: parseCheckbox(payload.locationAgnostic),
    subdomain: typeof payload.subdomain === 'string' ? payload.subdomain.trim() : '',
    subdirectory: typeof payload.subdirectory === 'string' ? payload.subdirectory.trim() : '',
    heroTitle: typeof payload.heroTitle === 'string' ? payload.heroTitle.trim() : '',
    heroSubtitle: typeof payload.heroSubtitle === 'string' ? payload.heroSubtitle.trim() : '',
    introMarkdown: typeof payload.introMarkdown === 'string' ? payload.introMarkdown.trim() : '',
    metaTitle: typeof payload.metaTitle === 'string' ? payload.metaTitle.trim() : '',
    metaDescription: typeof payload.metaDescription === 'string' ? payload.metaDescription.trim() : '',
    metaKeywords: collapseSpaces(payload.metaKeywords || ''),
    ogImageUrl: typeof payload.ogImageUrl === 'string' ? payload.ogImageUrl.trim() : '',
    status: normalizeStatus(payload.status, 'DRAFT')
  };
}

function decorateDirectory(record, options) {
  const categories = options.categories || [];
  const locations = options.locations || [];
  const categoryLookup = new Map(categories.map((entry) => [String(entry.id), entry.label]));
  const locationLookup = new Map();
  locations.forEach((entry) => {
    if (entry?.id) {
      locationLookup.set(String(entry.id), entry.label);
    }
    if (entry?.slug) {
      locationLookup.set(entry.slug, entry.label);
    }
  });

  const categoryId = record.categoryId ?? record.category?.id ?? null;
  const categoryLabel = categoryLookup.get(String(categoryId)) || record.category?.name || 'Unknown category';

  const locationLabel = record.locationAgnostic
    ? 'Location agnostic'
    : resolveLocationLabel(record, locationLookup);
  const locationLabels = locationLabel ? [locationLabel] : [];

  return {
    ...record,
    categoryLabel,
    locationLabels
  };
}

function parseLocationId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
}

function parseCategoryId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
}

function resolveLocationLabel(record, locationLookup = new Map()) {
  const location = record?.location;
  if (location?.name) {
    const pieces = [location.name, location.state || location.region, location.country];
    const joined = pieces.filter(Boolean).join(', ');
    if (joined) {
      return joined;
    }
  }

  const locationId = record?.locationId ?? location?.id ?? null;
  if (locationId && locationLookup.has(String(locationId))) {
    return locationLookup.get(String(locationId));
  }

  const locationSlug = location?.slug ?? record?.locationSlug;
  if (locationSlug) {
    return locationLookup.get(locationSlug) || locationSlug;
  }

  return null;
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

function sanitizeSubdomain(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizeSubdirectory(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  const withoutEdges = trimmed.replace(/^\/+|\/+$/g, '');
  return withoutEdges.replace(/\/+/g, '/');
}

function buildSlug(value = '') {
  const normalized = sanitizeSubdirectory(value);
  if (!normalized) {
    return '';
  }
  return normalized
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function collapseSpaces(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeStatus(value, fallback = 'DRAFT') {
  if (typeof value !== 'string') {
    return fallback || 'DRAFT';
  }
  const upper = value.trim().toUpperCase();
  return STATUSES.includes(upper) ? upper : fallback || STATUSES[0];
}

function buildPagination(meta, recordCount, perPageHint) {
  if (meta && Number.isFinite(meta.page) && Number.isFinite(meta.limit)) {
    const page = Math.max(1, Math.trunc(meta.page));
    const perPage = Math.max(1, Math.trunc(meta.limit));
    const totalItems = Number.isFinite(meta.totalCount) ? Math.max(0, meta.totalCount) : recordCount;
    const totalPages = meta.totalPages
      ? Math.max(1, Math.trunc(meta.totalPages))
      : Math.max(1, Math.ceil(Math.max(totalItems, 1) / perPage));
    const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1;
    const end = totalItems === 0 ? 0 : Math.min(start + recordCount - 1, totalItems);
    return {
      totalItems,
      totalPages,
      page,
      perPage,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < totalPages ? page + 1 : null,
      start,
      end
    };
  }

  const totalItems = recordCount || 0;
  const perPage = perPageHint || Math.max(recordCount, 1) || 1;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalItems, 1) / perPage));
  return {
    totalItems,
    totalPages,
    page: 1,
    perPage,
    hasPrevious: false,
    hasNext: false,
    previousPage: null,
    nextPage: null,
    start: totalItems === 0 ? 0 : 1,
    end: totalItems
  };
}

function buildApiErrorBag(error) {
  const payload = error?.payload || {};
  const summary = Array.isArray(payload.details) ? payload.details.join(' ') : payload.error;
  return {
    form: summary || error.message || 'Failed to save directory page'
  };
}

module.exports = {
  getDirectoryPages,
  getDirectoryOptions,
  getDirectoryPage,
  createDirectoryPage,
  updateDirectoryPage,
  deleteDirectoryPage,
  STATUSES
};
