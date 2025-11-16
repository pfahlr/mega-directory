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

async function getDirectoryPages() {
  const [directories, options] = await Promise.all([apiClient.fetchDirectories(), getDirectoryOptions()]);
  return directories.map((entry) => decorateDirectory(entry, options));
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
    categoryIds: [],
    locationIds: []
  };

  normalized.slug = normalized.subdirectory ? buildSlug(normalized.subdirectory) : buildSlug(normalized.title);

  const categoryId = parseCategoryId(payload.categoryId);
  if (!categoryId) {
    errors.categoryId = 'Select a category';
  } else {
    normalized.categoryIds = [categoryId];
  }

  if (!normalized.locationAgnostic) {
    const locationId = typeof payload.locationId === 'string' ? payload.locationId.trim() : '';
    if (!locationId) {
      errors.locationId = 'Select a location';
    } else {
      normalized.locationIds = [locationId];
    }
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
  const locationLookup = new Map(locations.map((entry) => [entry.id, entry.label]));
  const primaryCategoryId = Array.isArray(record.categoryIds) ? record.categoryIds[0] : null;
  const categoryLabel = categoryLookup.get(String(primaryCategoryId)) || 'Unknown category';
  const locationLabels = record.locationAgnostic
    ? ['Location agnostic']
    : (Array.isArray(record.locationIds) ? record.locationIds : []).map(
        (locationId) => locationLookup.get(locationId) || locationId
      );
  return {
    ...record,
    categoryLabel,
    locationLabels
  };
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
