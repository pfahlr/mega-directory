const express = require('express');
const jwt = require('jsonwebtoken');

const DEFAULT_PORT = 3001;
const DEFAULT_LISTING_STATUS = 'INACTIVE';
const MAX_SLUG_LENGTH = 80;
const DEFAULT_ADMIN_TOKEN_TTL_SECONDS = 60 * 15;

function resolveConfig(overrides = {}) {
  const parsedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const envPort = Number.isNaN(parsedPort) ? undefined : parsedPort;
  const parsedAdminTokenTtl =
    overrides.adminTokenTtlSeconds ??
    (process.env.ADMIN_TOKEN_TTL_SECONDS
      ? parseInt(process.env.ADMIN_TOKEN_TTL_SECONDS, 10)
      : undefined);

  const baseConfig = {
    port: overrides.port ?? envPort ?? DEFAULT_PORT,
    adminJwtSecret: overrides.adminJwtSecret ?? process.env.ADMIN_JWT_SECRET,
    adminJwtIssuer: overrides.adminJwtIssuer ?? process.env.ADMIN_JWT_ISSUER ?? 'mega-directory',
    adminJwtAudience: overrides.adminJwtAudience ?? process.env.ADMIN_JWT_AUDIENCE ?? 'admin',
    crawlerBearerToken: overrides.crawlerBearerToken ?? process.env.CRAWLER_BEARER_TOKEN,
    adminLoginEmail:
      overrides.adminLoginEmail ??
      process.env.ADMIN_LOGIN_EMAIL ??
      process.env.ADMIN_EMAIL ??
      null,
    adminLoginPasscode:
      overrides.adminLoginPasscode ??
      process.env.ADMIN_LOGIN_PASSCODE ??
      process.env.ADMIN_PASSCODE ??
      null,
    adminTokenTtlSeconds:
      Number.isFinite(parsedAdminTokenTtl) && parsedAdminTokenTtl > 0
        ? parsedAdminTokenTtl
        : DEFAULT_ADMIN_TOKEN_TTL_SECONDS
  };

  const missing = [];
  if (!baseConfig.adminJwtSecret) {
    missing.push('ADMIN_JWT_SECRET');
  }
  if (!baseConfig.adminLoginEmail) {
    missing.push('ADMIN_LOGIN_EMAIL');
  }
  if (!baseConfig.adminLoginPasscode) {
    missing.push('ADMIN_LOGIN_PASSCODE');
  }
  if (!baseConfig.crawlerBearerToken) {
    missing.push('CRAWLER_BEARER_TOKEN');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required config value(s): ${missing.join(', ')}`);
  }

  return baseConfig;
}

function createServer(overrides = {}) {
  const config = resolveConfig(overrides);
  const app = express();

  app.locals.config = config;
  app.locals.ingestionStore = createListingStore();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/v1/admin/auth', createAdminAuthHandler(config));

  app.get('/v1/admin/ping', requireAdminAuth(config), (_req, res) => {
    res.json({ status: 'admin-ok' });
  });

  app.post('/v1/crawler/ping', requireCrawlerToken(config), (_req, res) => {
    res.json({ status: 'crawler-ok' });
  });

  app.post(
    '/v1/crawler/listings',
    requireCrawlerToken(config),
    createListingIngestionHandler(app)
  );

  return app;
}

function extractBearerToken(req) {
  const headerSource =
    (typeof req.get === 'function' && req.get('authorization')) ||
    (typeof req.header === 'function' && req.header('authorization')) ||
    req.headers?.authorization ||
    req.headers?.Authorization;

  if (!headerSource) {
    return null;
  }

  const [scheme, token] = headerSource.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function requireAdminAuth(config) {
  return (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Admin token missing or invalid' });
    }

    try {
      const payload = jwt.verify(token, config.adminJwtSecret, {
        issuer: config.adminJwtIssuer,
        audience: config.adminJwtAudience
      });
      req.admin = payload;
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Admin token missing or invalid' });
    }
  };
}

function requireCrawlerToken(config) {
  return (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token || token !== config.crawlerBearerToken) {
      return res.status(401).json({ error: 'Crawler token missing or invalid' });
    }

    return next();
  };
}

function createAdminAuthHandler(config) {
  return (req, res) => {
    const body = isPlainObject(req.body) ? req.body : {};
    const email = sanitizeNullableString(body.email);
    const passcode = typeof body.passcode === 'string' ? body.passcode : null;
    const errors = [];

    if (!email) {
      errors.push('email is required');
    }
    if (!passcode) {
      errors.push('passcode is required');
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid admin credentials', details: errors });
    }

    const expectedEmail = (sanitizeNullableString(config.adminLoginEmail) || '').toLowerCase();
    const normalizedEmail = email.toLowerCase();
    const expectedPasscode = config.adminLoginPasscode;

    if (!expectedEmail || !expectedPasscode) {
      return res.status(500).json({ error: 'Admin authentication is not configured' });
    }

    if (normalizedEmail !== expectedEmail || passcode !== expectedPasscode) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const expiresIn =
      Number.isFinite(config.adminTokenTtlSeconds) && config.adminTokenTtlSeconds > 0
        ? config.adminTokenTtlSeconds
        : DEFAULT_ADMIN_TOKEN_TTL_SECONDS;

    const token = jwt.sign(
      { sub: normalizedEmail, role: 'admin', type: 'access' },
      config.adminJwtSecret,
      {
        issuer: config.adminJwtIssuer,
        audience: config.adminJwtAudience,
        expiresIn
      }
    );

    return res.json({
      token,
      tokenType: 'Bearer',
      expiresIn
    });
  };
}

function startServer() {
  const app = createServer();
  const { port } = app.locals.config ?? { port: DEFAULT_PORT };

  app.listen(port, () => {
    console.log(`API server running at http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer
};

function createListingIngestionHandler(app) {
  return (req, res) => {
    const payloads = normalizeListingBatch(req.body);
    if (!payloads) {
      return res
        .status(400)
        .json({ error: 'Invalid listing payload', details: ['Request body must be an object or array'] });
    }
    if (payloads.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid listing payload', details: ['At least one listing must be provided'] });
    }

    const validations = payloads.map((payload) => validateListingPayload(payload));
    const invalidEntries = validations
      .map((result, index) => ({ index, result }))
      .filter((item) => !item.result.valid)
      .map((item) => ({ index: item.index, messages: item.result.errors }));

    if (invalidEntries.length > 0) {
      return res.status(400).json({ error: 'Invalid listing payload', details: invalidEntries });
    }

    const store = app.locals.ingestionStore;
    const savedRecords = validations.map((validation, index) =>
      store.insert(validation.value, payloads[index])
    );

    return res.status(202).json({
      ingestedCount: savedRecords.length,
      ingested: savedRecords.map(({ id, title, slug, status, categorySlug, ingestedAt }) => ({
        id,
        title,
        slug,
        status,
        categorySlug,
        ingestedAt
      }))
    });
  };
}

function normalizeListingBatch(payload) {
  if (Array.isArray(payload)) {
    return payload.slice();
  }
  if (isPlainObject(payload) && Array.isArray(payload.listings)) {
    return payload.listings.slice();
  }
  if (isPlainObject(payload)) {
    return [payload];
  }
  return null;
}

function validateListingPayload(payload) {
  const errors = [];
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['Each listing must be an object'] };
  }

  const title = sanitizeNullableString(payload.title);
  if (!title) {
    errors.push('title is required');
  }

  const slugCandidate = sanitizeNullableString(payload.slug) || title || '';
  const slug = slugify(slugCandidate);
  if (!slug) {
    errors.push('slug is required or must be derivable from title');
  }

  const categorySlugInput = sanitizeNullableString(payload.categorySlug);
  const categorySlug = categorySlugInput ? slugify(categorySlugInput) : '';
  if (!categorySlug) {
    errors.push('categorySlug is required');
  }

  const websiteUrl = optionalUrl(payload.websiteUrl, 'websiteUrl', errors);
  const sourceUrl = optionalUrl(payload.sourceUrl, 'sourceUrl', errors);
  const contactEmail = optionalEmail(payload.contactEmail, 'contactEmail', errors);
  const summary = sanitizeNullableString(payload.summary);
  const tagline = sanitizeNullableString(payload.tagline);
  const notes = sanitizeNullableString(payload.notes);
  const sourceName = sanitizeNullableString(payload.sourceName);
  const location = sanitizeLocation(payload.location);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      title,
      slug,
      categorySlug,
      websiteUrl,
      sourceUrl,
      contactEmail,
      summary,
      tagline,
      notes,
      sourceName,
      location
    }
  };
}

function createListingStore() {
  let nextId = 1;
  const listings = [];
  return {
    insert(listing, rawPayload) {
      const record = {
        id: nextId++,
        title: listing.title,
        slug: listing.slug,
        categorySlug: listing.categorySlug,
        status: DEFAULT_LISTING_STATUS,
        websiteUrl: listing.websiteUrl ?? null,
        sourceUrl: listing.sourceUrl ?? null,
        sourceName: listing.sourceName ?? null,
        contactEmail: listing.contactEmail ?? null,
        summary: listing.summary ?? null,
        tagline: listing.tagline ?? null,
        notes: listing.notes ?? null,
        location: listing.location ?? null,
        ingestedAt: new Date().toISOString(),
        rawPayload: rawPayload ?? null
      };
      listings.push(record);
      return record;
    },
    all() {
      return listings.slice();
    }
  };
}

function slugify(value, maxLength = MAX_SLUG_LENGTH) {
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
  return normalized;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeNullableString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalUrl(value, fieldName, errors) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${fieldName} must be a valid URL string`);
    return null;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.toString();
  } catch (_err) {
    errors.push(`${fieldName} must be a valid URL string`);
    return null;
  }
}

function optionalEmail(value, fieldName, errors) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${fieldName} must be a valid email address`);
    return null;
  }
  const email = value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push(`${fieldName} must be a valid email address`);
    return null;
  }
  return email.toLowerCase();
}

function sanitizeLocation(value) {
  if (!isPlainObject(value)) {
    return null;
  }
  const fields = ['addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'country'];
  const location = {};
  fields.forEach((field) => {
    const sanitized = sanitizeNullableString(value[field]);
    if (sanitized) {
      location[field] = sanitized;
    }
  });
  return Object.keys(location).length > 0 ? location : null;
}
