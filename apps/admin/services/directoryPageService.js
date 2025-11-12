const directoryPages = require('../data/directoryPages');
const directoryOptions = require('../data/directoryPageOptions');

const STATUSES = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

function getDirectoryPages() {
  return directoryPages.map((page) => ({
    ...page,
    categoryLabel: resolveCategory(page.categoryId)?.label ?? 'Unknown category',
    locationLabel: page.locationAgnostic
      ? 'Location agnostic'
      : resolveLocation(page.locationId)?.label ?? 'Unknown location'
  }));
}

function getDirectoryOptions() {
  return {
    categories: directoryOptions.categories.slice(),
    locations: directoryOptions.locations.slice(),
    statuses: Object.values(STATUSES)
  };
}

function createDirectoryPage(payload = {}) {
  const { record, errors } = normalizePayload(payload, { mode: 'create' });
  if (hasErrors(errors)) {
    return { errors };
  }

  const timestamp = new Date().toISOString();
  const storedRecord = {
    ...record,
    id: record.id || generateId(record.title),
    createdAt: timestamp,
    updatedAt: timestamp,
    status: STATUSES.DRAFT,
    isActive: false
  };

  directoryPages.push(storedRecord);
  return { record: storedRecord, errors: null };
}

function updateDirectoryPages(updates = []) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { updated: 0, errors: null };
  }

  let updated = 0;
  const errorBag = {};

  updates.forEach((payload) => {
    if (!payload?.id) {
      return;
    }

    const record = directoryPages.find((entry) => entry.id === payload.id);
    if (!record) {
      return;
    }

    const { record: nextState, errors } = normalizePayload(payload, {
      mode: 'update',
      existingRecord: record
    });

    if (hasErrors(errors)) {
      errorBag[record.id] = errors;
      return;
    }

    Object.assign(record, nextState);

    if (parseCheckbox(payload.deactivate)) {
      record.status = STATUSES.ARCHIVED;
      record.isActive = false;
    } else if (parseCheckbox(payload.save)) {
      record.status = STATUSES.ACTIVE;
      record.isActive = true;
    }

    record.updatedAt = new Date().toISOString();
    updated += 1;
  });

  return {
    updated,
    errors: Object.keys(errorBag).length ? errorBag : null
  };
}

function normalizePayload(payload = {}, { mode, existingRecord } = {}) {
  if (mode === 'update' && !existingRecord) {
    throw new Error('existingRecord is required for update mode');
  }

  const baseRecord = existingRecord
    ? { ...existingRecord }
    : {
        id: null,
        title: '',
        slug: '',
        categoryId: '',
        locationId: null,
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
        status: STATUSES.DRAFT,
        isActive: false,
        createdAt: null,
        updatedAt: null
      };

  const next = { ...baseRecord };
  const errors = {};

  assignString(next, payload, 'title');
  assignString(next, payload, 'heroTitle');
  assignString(next, payload, 'heroSubtitle');
  assignString(next, payload, 'introMarkdown');
  assignString(next, payload, 'metaTitle');
  assignString(next, payload, 'metaDescription');
  assignString(next, payload, 'metaKeywords', { collapseWhitespace: true });
  assignString(next, payload, 'ogImageUrl');

  if (payload.categoryId !== undefined || mode === 'create') {
    const value = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
    next.categoryId = value || '';
  }

  if (payload.locationAgnostic !== undefined || mode === 'create') {
    next.locationAgnostic = parseCheckbox(payload.locationAgnostic);
  }

  if (payload.locationId !== undefined) {
    const value = typeof payload.locationId === 'string' ? payload.locationId.trim() : '';
    next.locationId = value || null;
  } else if (!existingRecord && next.locationId === undefined) {
    next.locationId = null;
  }

  if (next.locationAgnostic) {
    next.locationId = null;
  }

  if (payload.subdomain !== undefined || mode === 'create') {
    next.subdomain = sanitizeSubdomain(payload.subdomain);
  }

  if (payload.subdirectory !== undefined || mode === 'create') {
    next.subdirectory = sanitizeSubdirectory(payload.subdirectory);
    next.slug = buildSlug(next.subdirectory);
  } else if (!next.slug && next.subdirectory) {
    next.slug = buildSlug(next.subdirectory);
  }

  validateRecord(next, errors, { mode, currentId: existingRecord?.id ?? null });

  return { record: next, errors };
}

function validateRecord(record, errors, { mode, currentId }) {
  if (!record.title) {
    errors.title = 'Title is required';
  }

  if (!record.categoryId || !resolveCategory(record.categoryId)) {
    errors.categoryId = 'Select a valid category';
  }

  if (!record.metaTitle) {
    errors.metaTitle = 'Meta title is required';
  }

  if (!record.metaDescription) {
    errors.metaDescription = 'Meta description is required';
  }

  if (!record.subdomain) {
    errors.subdomain = 'Subdomain is required';
  } else if (!isUnique('subdomain', record.subdomain, currentId)) {
    errors.subdomain = 'Subdomain is already in use';
  }

  if (!record.subdirectory) {
    errors.subdirectory = 'Subdirectory is required';
  } else if (!isUnique('subdirectory', record.subdirectory, currentId)) {
    errors.subdirectory = 'Subdirectory is already in use';
  }

  if (!record.locationAgnostic) {
    if (!record.locationId) {
      errors.locationId = 'Select a location';
    } else if (!resolveLocation(record.locationId)) {
      errors.locationId = 'Select a valid location';
    }
  }
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

function buildSlug(subdirectory = '') {
  const normalized = sanitizeSubdirectory(subdirectory);
  if (!normalized) {
    return '';
  }
  return normalized
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function assignString(target, payload, field, { collapseWhitespace = false } = {}) {
  if (payload[field] === undefined) {
    return;
  }

  if (typeof payload[field] !== 'string') {
    target[field] = '';
    return;
  }

  const value = collapseWhitespace
    ? collapseSpaces(payload[field])
    : payload[field].trim();
  target[field] = value;
}

function collapseSpaces(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function resolveCategory(id) {
  return directoryOptions.categories.find((entry) => entry.id === id) || null;
}

function resolveLocation(id) {
  if (!id) {
    return null;
  }
  return directoryOptions.locations.find((entry) => entry.id === id) || null;
}

function isUnique(field, value, currentId = null) {
  if (!value) {
    return true;
  }

  const normalized = value.toLowerCase();
  return !directoryPages.some((entry) => {
    if (!entry[field]) {
      return false;
    }
    if (currentId && entry.id === currentId) {
      return false;
    }
    return entry[field].toLowerCase() === normalized;
  });
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

function generateId(title = 'directory_page') {
  const suffix = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'entry';
  return `dir_${suffix}_${Date.now()}`;
}

function hasErrors(errors) {
  return errors && Object.keys(errors).length > 0;
}

module.exports = {
  getDirectoryPages,
  getDirectoryOptions,
  createDirectoryPage,
  updateDirectoryPages,
  STATUSES
};
