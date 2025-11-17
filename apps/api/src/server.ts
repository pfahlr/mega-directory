import express, { type Express, type Request, type RequestHandler, type Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { DEFAULT_PORTS, PROJECT_NAME } from '@mega-directory/config';
import directoryCatalog from '@mega-directory/directory-data';
import { geocodeListingLocation, type GeocodingAddress } from './geocoding';
import { createLogger, createRequestLogger, type Logger } from './logger';
import { initializePrisma, disconnectPrisma, prisma, getListingsWithRelations, getDirectoriesWithData, createListingWithAddress } from './db';
import { ListingWithRelations, ListingStatus as PrismaListingStatus, DirectoryStatus as PrismaDirectoryStatus } from './types';

const DEFAULT_PORT = DEFAULT_PORTS.api;
const DEFAULT_LISTING_STATUS: ListingStatus = 'INACTIVE';
const MAX_SLUG_LENGTH = 80;
const DEFAULT_ADMIN_TOKEN_TTL_SECONDS = 60 * 15;

type ExpressApp = ReturnType<typeof express>;

type ListingStatus = 'INACTIVE' | 'ACTIVE' | 'PENDING' | 'APPROVED' | 'REJECTED';

type DirectoryStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

type NullableString = string | null;

type ListingLocation =
  | (GeocodingAddress & {
      latitude?: number;
      longitude?: number;
      geocodedBy?: string | null;
      geocodedAt?: string | null;
    })
  | null;

interface NormalizedListing {
  title: string;
  slug: string;
  categorySlug: string;
  websiteUrl: NullableString;
  sourceUrl: NullableString;
  contactEmail: NullableString;
  summary: NullableString;
  tagline: NullableString;
  notes: NullableString;
  sourceName: NullableString;
  location: ListingLocation;
}

interface ListingRecord extends NormalizedListing {
  id: number;
  status: ListingStatus;
  ingestedAt: string;
  rawPayload: unknown;
}

interface ListingStore {
  insert(listing: NormalizedListing, rawPayload: unknown): ListingRecord;
  all(): ListingRecord[];
}

interface AdminListingRecord {
  id: number;
  title: string;
  slug: string;
  status: ListingStatus;
  summary: NullableString;
  websiteUrl: NullableString;
  sourceUrl: NullableString;
  contactEmail: NullableString;
  notes: NullableString;
  sourceName: NullableString;
  categoryIds: number[];
  addressIds: number[];
  createdAt: string;
  updatedAt: string;
}

interface ListingAddressRecord {
  id: number;
  listingId: number;
  label: NullableString;
  addressLine1: NullableString;
  addressLine2: NullableString;
  city: NullableString;
  region: NullableString;
  postalCode: NullableString;
  country: NullableString;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListingReviewEntry {
  index: number;
  id: number;
  businessName?: string;
  website?: NullableString;
  notes?: NullableString;
  status?: ListingStatus;
}

interface ListingReviewFailure {
  index: number;
  id?: number;
  reason: string;
}

interface CategoryRecord {
  id: number;
  name: string;
  slug: string;
  description: NullableString;
  metaTitle: NullableString;
  metaDescription: NullableString;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DirectoryRecord {
  id: number;
  title: string;
  slug: string;
  subdomain: NullableString;
  subdirectory: NullableString;
  heroTitle: NullableString;
  heroSubtitle: NullableString;
  introMarkdown: NullableString;
  metaTitle: NullableString;
  metaDescription: NullableString;
  metaKeywords: NullableString;
  ogImageUrl: NullableString;
  status: DirectoryStatus;
  locationAgnostic: boolean;
  categoryIds: number[];
  locationIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface ListingValidationSuccess {
  valid: true;
  value: NormalizedListing;
}

interface ListingValidationFailure {
  valid: false;
  errors: string[];
}

type ListingValidationResult = ListingValidationSuccess | ListingValidationFailure;

export interface ServerConfig {
  port: number;
  adminJwtSecret: string;
  adminJwtIssuer: string;
  adminJwtAudience: string;
  crawlerBearerToken: string;
  adminLoginEmail: string;
  adminLoginPasscode: string;
  adminTokenTtlSeconds: number;
  geocodeMapsApiKey: string;
  googleGeocodeApiKey: string;
}

interface CreateServerOptions extends Partial<ServerConfig> {
  logger?: Logger;
  logLevel?: string;
}

interface HealthState {
  startedAt: Date;
  lastCheck?: Date;
}

interface AppLocals {
  config: ServerConfig;
  ingestionStore: ListingStore;
  logger: Logger;
  health: HealthState;
}

declare global {
  namespace Express {
    interface Request {
      admin?: JwtPayload | string;
    }
  }
}

export function resolveConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  const parsedPort = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined;
  const envPort = typeof parsedPort === 'number' && !Number.isNaN(parsedPort) ? parsedPort : undefined;
  const parsedAdminTokenTtl =
    overrides.adminTokenTtlSeconds ??
    (process.env.ADMIN_TOKEN_TTL_SECONDS
      ? Number.parseInt(process.env.ADMIN_TOKEN_TTL_SECONDS, 10)
      : undefined);

  const baseConfig: ServerConfig = {
    port: overrides.port ?? envPort ?? DEFAULT_PORT,
    adminJwtSecret: overrides.adminJwtSecret ?? process.env.ADMIN_JWT_SECRET ?? '',
    adminJwtIssuer: overrides.adminJwtIssuer ?? process.env.ADMIN_JWT_ISSUER ?? PROJECT_NAME,
    adminJwtAudience: overrides.adminJwtAudience ?? process.env.ADMIN_JWT_AUDIENCE ?? 'admin',
    crawlerBearerToken: overrides.crawlerBearerToken ?? process.env.CRAWLER_BEARER_TOKEN ?? '',
    adminLoginEmail:
      overrides.adminLoginEmail ??
      process.env.ADMIN_LOGIN_EMAIL ??
      process.env.ADMIN_EMAIL ??
      '',
    adminLoginPasscode:
      overrides.adminLoginPasscode ??
      process.env.ADMIN_LOGIN_PASSCODE ??
      process.env.ADMIN_PASSCODE ??
      '',
    adminTokenTtlSeconds:
      typeof parsedAdminTokenTtl === 'number' && Number.isFinite(parsedAdminTokenTtl) && parsedAdminTokenTtl > 0
        ? parsedAdminTokenTtl
        : DEFAULT_ADMIN_TOKEN_TTL_SECONDS,
    geocodeMapsApiKey: overrides.geocodeMapsApiKey ?? process.env.GEOCODEMAPS_API_KEY ?? '',
    googleGeocodeApiKey: overrides.googleGeocodeApiKey ?? process.env.GOOGLEMAPS_API_KEY ?? ''
  };

  const missing: string[] = [];
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

export function createServer(options: CreateServerOptions = {}): Express {
  const { logger: loggerOverride, logLevel, ...configOverrides } = options;
  const config = resolveConfig(configOverrides);
  const logger =
    loggerOverride ||
    createLogger({
      level: typeof logLevel === 'string' ? logLevel : undefined,
      name: `${PROJECT_NAME} API`
    });
  const app = express();
  const locals = getAppLocals(app);

  locals.config = config;
  locals.ingestionStore = createListingStore();
  locals.logger = logger;
  locals.health = { startedAt: new Date() };

  app.use(createRequestLogger(logger));
  app.use(express.json());

  const adminAuth = requireAdminAuth(config);
  const crawlerAuth = requireCrawlerToken(config);

  app.get('/health', (_req, res) => {
    const now = new Date();
    locals.health.lastCheck = now;
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      startedAt: locals.health.startedAt.toISOString(),
      timestamp: now.toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  app.post('/v1/admin/auth', createAdminAuthHandler(config));

  app.get('/v1/admin/ping', adminAuth, (_req, res) => {
    res.json({ status: 'admin-ok' });
  });

  app.post('/v1/crawler/ping', crawlerAuth, (_req, res) => {
    res.json({ status: 'crawler-ok' });
  });

  app.post('/v1/crawler/listings', crawlerAuth, createListingIngestionHandler(app));

  app.get('/v1/directories', (_req, res) => {
    res.json({ data: directoryCatalog });
  });

  app.get('/v1/directories/:slug', (req, res) => {
    const slugParam = sanitizeNullableString(req.params?.slug);
    if (!slugParam) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    const normalized = slugify(slugParam);
    const entry =
      directoryCatalog.find(
        (record: { slug?: string }) => slugify(record?.slug ?? '') === normalized
      ) ?? null;
    if (!entry) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    return res.json({ data: entry });
  });

  registerAdminRoutes(app, adminAuth);

  return app;
}

export function startServer() {
  const app = createServer();
  const { port } = getAppLocals(app).config;

  // Initialize database connection
  initializePrisma()
    .then(() => {
      app.listen(port, () => {
        getAppLocals(app).logger.info(
          { event: 'api.start', port, environment: process.env.NODE_ENV || 'development' },
          `API server running at http://localhost:${port}`
        );
      });
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await disconnectPrisma();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await disconnectPrisma();
    process.exit(0);
  });
}

if (require.main === module) {
  startServer();
}

function extractBearerToken(req: Request) {
  const headerSource =
    (typeof req.get === 'function' && req.get('authorization')) ||
    (typeof req.header === 'function' && req.header('authorization')) ||
    req.headers?.authorization ||
    (req.headers as Record<string, string | undefined>)?.Authorization;

  if (!headerSource) {
    return null;
  }

  const [scheme, token] = headerSource.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function requireAdminAuth(config: ServerConfig): RequestHandler {
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
    } catch (_err) {
      return res.status(401).json({ error: 'Admin token missing or invalid' });
    }
  };
}

function requireCrawlerToken(config: ServerConfig): RequestHandler {
  return (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token || token !== config.crawlerBearerToken) {
      return res.status(401).json({ error: 'Crawler token missing or invalid' });
    }

    return next();
  };
}

function createAdminAuthHandler(config: ServerConfig): RequestHandler {
  return (req, res) => {
    const body = isPlainObject(req.body) ? req.body : {};
    const email = sanitizeNullableString(body.email);
    const passcode = typeof body.passcode === 'string' ? body.passcode : null;
    const errors: string[] = [];

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
    const normalizedEmail = (email as string).toLowerCase();
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

function createListingIngestionHandler(app: Express): RequestHandler {
  return async (req, res) => {
    const locals = getAppLocals(app);
    const logger = locals.logger;
    const config = locals.config;
    const payloads = normalizeListingBatch(req.body);
    if (!payloads) {
      logger.warn(
        { event: 'listings.ingest.invalid', reason: 'bad-shape' },
        'Invalid listing payload received'
      );
      return res
        .status(400)
        .json({ error: 'Invalid listing payload', details: ['Request body must be an object or array'] });
    }
    if (payloads.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid listing payload', details: ['At least one listing must be provided'] });
    }

    const invalidEntries: Array<{ index: number; messages: string[] }> = [];
    const validEntries: Array<{ index: number; value: NormalizedListing }> = [];

    payloads.forEach((payload, index) => {
      const validation = validateListingPayload(payload);
      if (validation.valid) {
        validEntries.push({ index, value: validation.value });
      } else {
        invalidEntries.push({ index, messages: validation.errors });
      }
    });

    if (invalidEntries.length > 0) {
      logger.warn(
        {
          event: 'listings.ingest.invalid',
          reason: 'validation-failed',
          failures: invalidEntries.length
        },
        'Rejected crawler listings batch due to validation errors'
      );
      return res.status(400).json({ error: 'Invalid listing payload', details: invalidEntries });
    }

    const geocodeConfig = {
      geocodeMapsApiKey: config.geocodeMapsApiKey,
      googleGeocodeApiKey: config.googleGeocodeApiKey
    };

    const enrichedEntries = await Promise.all(
      validEntries.map(async ({ index, value }) => {
        if (value.location) {
          const coords = await geocodeListingLocation(value.location, geocodeConfig, logger);
          if (coords) {
            value.location = {
              ...value.location,
              latitude: coords.latitude,
              longitude: coords.longitude,
              geocodedBy: coords.provider,
              geocodedAt: new Date().toISOString()
            };
          }
        }
        return { index, value };
      })
    );

    const store = locals.ingestionStore;
    const savedRecords = enrichedEntries.map(({ index, value }) =>
      store.insert(value, payloads[index])
    );
    const categories = Array.from(new Set(savedRecords.map((record) => record.categorySlug)));
    logger.info(
      {
        event: 'listings.ingested',
        ingestedCount: savedRecords.length,
        categories
      },
      'Accepted crawler listings batch'
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

function normalizeListingBatch(payload: unknown): unknown[] | null {
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

function validateListingPayload(payload: unknown): ListingValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['Each listing must be an object'] };
  }

  const title = sanitizeNullableString(payload.title);
  if (!title) {
    errors.push('title is required');
  }

  const categorySlug = sanitizeNullableString(payload.categorySlug);
  if (!categorySlug) {
    errors.push('categorySlug is required');
  }

  const slugSource = sanitizeNullableString(payload.slug) ?? title;
  const slug = slugify(slugSource || '');
  if (!slug) {
    errors.push('slug is required');
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
      title: title as string,
      slug,
      categorySlug: categorySlug as string,
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

function createListingStore(): ListingStore {
  let nextId = 1;
  const listings: ListingRecord[] = [];
  return {
    insert(listing, rawPayload) {
      const record: ListingRecord = {
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

function registerAdminRoutes(app: ExpressApp, adminAuth: RequestHandler) {
  registerAdminCategoryRoutes(app, adminAuth);
  registerAdminListingRoutes(app, adminAuth);
  registerAdminAddressRoutes(app, adminAuth);
  registerAdminDirectoryRoutes(app, adminAuth);
}

function registerAdminCategoryRoutes(app: ExpressApp, adminAuth: RequestHandler) {
  app.get('/v1/admin/categories', adminAuth, async (_req: Request, res: Response) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: 'asc' },
      });
      res.json({ data: categories });
    } catch (error) {
      console.error('[admin] Failed to fetch categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  app.get('/v1/admin/categories/:categoryId', adminAuth, (req: Request, res: Response) => {
    const categoryId = parseIdParam(req.params?.categoryId);
    if (!categoryId) {
      return res.status(400).json({ error: 'Invalid category id' });
    }
    const store = getAppLocals(app).adminStore;
    const record = store.categories.find((entry) => entry.id === categoryId);
    if (!record) {
      return res.status(404).json({ error: 'Category not found' });
    }
    return res.json({ data: record });
  });

  app.post('/v1/admin/categories', adminAuth, async (req: Request, res: Response) => {
    try {
      const { name, slug, description } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ error: 'name and slug are required' });
      }

      const category = await prisma.category.create({
        data: { name, slug, description },
      });

      res.status(201).json({ data: category });
    } catch (error: any) {
      console.error('[admin] Failed to create category:', error);

      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Category with this slug already exists' });
      }

      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  app.put('/v1/admin/categories/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, slug, description } = req.body;

      const category = await prisma.category.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(slug && { slug }),
          ...(description !== undefined && { description }),
        },
      });

      res.json({ data: category });
    } catch (error: any) {
      console.error('[admin] Failed to update category:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  app.delete('/v1/admin/categories/:id', adminAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);

      await prisma.category.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error: any) {
      console.error('[admin] Failed to delete category:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (error.code === 'P2003') {
        return res.status(409).json({ error: 'Cannot delete category with associated listings' });
      }

      res.status(500).json({ error: 'Failed to delete category' });
    }
  });
}

function registerAdminListingRoutes(app: ExpressApp, adminAuth: RequestHandler) {
  app.get('/v1/admin/listings', adminAuth, (_req: Request, res: Response) => {
    const store = getAppLocals(app).adminStore;
    const data = store.listings.map((listing) => serializeListing(store, listing));
    res.json({ data });
  });

  app.get('/v1/admin/listings/:listingId', adminAuth, (req: Request, res: Response) => {
    const listingId = parseIdParam(req.params?.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'Invalid listing id' });
    }
    const store = getAppLocals(app).adminStore;
    const listing = store.listings.find((entry) => entry.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    return res.json({ data: serializeListing(store, listing) });
  });

  app.post('/v1/admin/listings', adminAuth, (req: Request, res: Response) => {
    const validation = validateAdminListingPayload(req.body, 'create');
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const store = getAppLocals(app).adminStore;
    if (store.listings.some((entry) => entry.slug === validation.value.slug)) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: ['slug already exists'] });
    }
    const categoryCheck = ensureCategoryIdsExist(
      store,
      validation.value.categoryIds ?? [],
      'categoryIds'
    );
    if (!categoryCheck.valid) {
      return res.status(400).json({ error: 'Validation failed', details: categoryCheck.errors });
    }
    const now = new Date().toISOString();
    const listing: AdminListingRecord = {
      id: store.nextListingId++,
      title: validation.value.title!,
      slug: validation.value.slug!,
      status: validation.value.status ?? 'PENDING',
      summary: validation.value.summary ?? null,
      websiteUrl: validation.value.websiteUrl ?? null,
      sourceUrl: validation.value.sourceUrl ?? null,
      contactEmail: validation.value.contactEmail ?? null,
      notes: validation.value.notes ?? null,
      sourceName: validation.value.sourceName ?? null,
      categoryIds: validation.value.categoryIds ?? [],
      addressIds: [],
      createdAt: now,
      updatedAt: now
    };
    store.listings.push(listing);
    if (validation.value.addresses && validation.value.addresses.length > 0) {
      replaceListingAddresses(store, listing, validation.value.addresses);
    }
    return res.status(201).json({ data: serializeListing(store, listing) });
  });

  app.put('/v1/admin/listings/:listingId', adminAuth, (req: Request, res: Response) => {
    const listingId = parseIdParam(req.params?.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'Invalid listing id' });
    }
    const store = getAppLocals(app).adminStore;
    const listing = store.listings.find((entry) => entry.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const validation = validateAdminListingPayload(req.body, 'update');
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    if (
      validation.value.slug &&
      store.listings.some((entry) => entry.slug === validation.value.slug && entry.id !== listing.id)
    ) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: ['slug already exists'] });
    }
    if (validation.value.categoryIds !== undefined) {
      const categoryCheck = ensureCategoryIdsExist(
        store,
        validation.value.categoryIds,
        'categoryIds'
      );
      if (!categoryCheck.valid) {
        return res.status(400).json({ error: 'Validation failed', details: categoryCheck.errors });
      }
      listing.categoryIds = validation.value.categoryIds;
    }
    if (validation.value.title !== undefined) {
      listing.title = validation.value.title;
    }
    if (validation.value.slug) {
      listing.slug = validation.value.slug;
    }
    if (validation.value.status) {
      listing.status = validation.value.status;
    }
    if (validation.value.summary !== undefined) {
      listing.summary = validation.value.summary;
    }
    if (validation.value.websiteUrl !== undefined) {
      listing.websiteUrl = validation.value.websiteUrl;
    }
    if (validation.value.sourceUrl !== undefined) {
      listing.sourceUrl = validation.value.sourceUrl;
    }
    if (validation.value.contactEmail !== undefined) {
      listing.contactEmail = validation.value.contactEmail;
    }
    if (validation.value.notes !== undefined) {
      listing.notes = validation.value.notes;
    }
    if (validation.value.sourceName !== undefined) {
      listing.sourceName = validation.value.sourceName;
    }
    if (validation.value.addresses !== undefined) {
      replaceListingAddresses(store, listing, validation.value.addresses);
    }
    listing.updatedAt = new Date().toISOString();
    return res.json({ data: serializeListing(store, listing) });
  });

  app.delete('/v1/admin/listings/:listingId', adminAuth, (req: Request, res: Response) => {
    const listingId = parseIdParam(req.params?.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'Invalid listing id' });
    }
    const store = getAppLocals(app).adminStore;
    const index = store.listings.findIndex((entry) => entry.id === listingId);
    if (index === -1) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    store.listings.splice(index, 1);
    store.addresses = store.addresses.filter((address) => address.listingId !== listingId);
    return res.status(204).json({});
  });

  app.post('/v1/admin/listings/review', adminAuth, (req: Request, res: Response) => {
    if (!isPlainObject(req.body) || !Array.isArray(req.body.listings)) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: ['listings must be an array']
      });
    }
    const store = getAppLocals(app).adminStore;
    let delivered = 0;
    const failures: ListingReviewFailure[] = [];

    req.body.listings.forEach((entry: unknown, index: number) => {
      const normalized = normalizeListingReviewEntry(entry, index);
      if ('errors' in normalized) {
        failures.push({
          index,
          reason: normalized.errors.join('; ')
        });
        return;
      }

      const record = normalized.record;
      const listing = store.listings.find((candidate) => candidate.id === record.id);
      if (!listing) {
        failures.push({ index, id: record.id, reason: 'Listing not found' });
        return;
      }

      if (record.businessName) {
        listing.title = record.businessName;
      }
      if (Object.prototype.hasOwnProperty.call(record, 'website')) {
        listing.websiteUrl = record.website ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(record, 'notes')) {
        listing.notes = record.notes ?? null;
      }
      if (record.status) {
        listing.status = record.status;
      }

      listing.updatedAt = new Date().toISOString();
      delivered += 1;
    });

    return res.json({
      data: {
        delivered,
        skipped: failures.length,
        failures
      }
    });
  });
}

function registerAdminAddressRoutes(app: ExpressApp, adminAuth: RequestHandler) {
  app.get('/v1/admin/addresses', adminAuth, (_req: Request, res: Response) => {
    const store = getAppLocals(app).adminStore;
    res.json({ data: store.addresses.slice() });
  });

  app.get('/v1/admin/addresses/:addressId', adminAuth, (req: Request, res: Response) => {
    const addressId = parseIdParam(req.params?.addressId);
    if (!addressId) {
      return res.status(400).json({ error: 'Invalid address id' });
    }
    const store = getAppLocals(app).adminStore;
    const record = store.addresses.find((entry) => entry.id === addressId);
    if (!record) {
      return res.status(404).json({ error: 'Address not found' });
    }
    return res.json({ data: record });
  });

  app.post('/v1/admin/addresses', adminAuth, (req: Request, res: Response) => {
    const body = isPlainObject(req.body) ? req.body : {};
    const listingId = parseIdParam(body.listingId);
    if (!listingId) {
      return res.status(400).json({ error: 'Validation failed', details: ['listingId is required'] });
    }
    const store = getAppLocals(app).adminStore;
    const listing = store.listings.find((entry) => entry.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const validation = validateAddressObject(body, { requireDetail: true });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const normalized = normalizeAddressForRecord(validation.value);
    const address = createAddressRecord(store, listing.id, normalized);
    listing.addressIds.push(address.id);
    listing.updatedAt = new Date().toISOString();
    if (address.isPrimary) {
      setPrimaryAddress(store, listing.id, address.id);
    } else {
      ensurePrimaryAddress(store, listing.id);
    }
    return res.status(201).json({ data: address });
  });

  app.put('/v1/admin/addresses/:addressId', adminAuth, (req: Request, res: Response) => {
    const addressId = parseIdParam(req.params?.addressId);
    if (!addressId) {
      return res.status(400).json({ error: 'Invalid address id' });
    }
    const store = getAppLocals(app).adminStore;
    const address = store.addresses.find((entry) => entry.id === addressId);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    const validation = validateAddressObject(req.body, { requireDetail: false });
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    if (validation.value.label !== undefined) {
      address.label = validation.value.label;
    }
    if (validation.value.addressLine1 !== undefined) {
      address.addressLine1 = validation.value.addressLine1;
    }
    if (validation.value.addressLine2 !== undefined) {
      address.addressLine2 = validation.value.addressLine2;
    }
    if (validation.value.city !== undefined) {
      address.city = validation.value.city;
    }
    if (validation.value.region !== undefined) {
      address.region = validation.value.region;
    }
    if (validation.value.postalCode !== undefined) {
      address.postalCode = validation.value.postalCode;
    }
    if (validation.value.country !== undefined) {
      address.country = validation.value.country ?? 'US';
    }
    if (validation.value.latitude !== undefined) {
      address.latitude = validation.value.latitude;
    }
    if (validation.value.longitude !== undefined) {
      address.longitude = validation.value.longitude;
    }
    if (validation.value.isPrimary !== undefined) {
      if (validation.value.isPrimary) {
        setPrimaryAddress(store, address.listingId, address.id);
      } else {
        address.isPrimary = false;
        ensurePrimaryAddress(store, address.listingId);
      }
    }
    if (!hasAddressDetails(address)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: ['Address must include at least one location field']
      });
    }
    address.updatedAt = new Date().toISOString();
    return res.json({ data: address });
  });

  app.delete('/v1/admin/addresses/:addressId', adminAuth, (req: Request, res: Response) => {
    const addressId = parseIdParam(req.params?.addressId);
    if (!addressId) {
      return res.status(400).json({ error: 'Invalid address id' });
    }
    const store = getAppLocals(app).adminStore;
    const index = store.addresses.findIndex((entry) => entry.id === addressId);
    if (index === -1) {
      return res.status(404).json({ error: 'Address not found' });
    }
    const [removed] = store.addresses.splice(index, 1);
    const listing = store.listings.find((entry) => entry.id === removed.listingId);
    if (listing) {
      listing.addressIds = listing.addressIds.filter((id) => id !== removed.id);
      listing.updatedAt = new Date().toISOString();
      ensurePrimaryAddress(store, listing.id);
    }
    return res.status(204).json({});
  });
}

function registerAdminDirectoryRoutes(app: ExpressApp, adminAuth: RequestHandler) {
  app.get('/v1/admin/directories', adminAuth, (_req: Request, res: Response) => {
    const store = getAppLocals(app).adminStore;
    res.json({ data: store.directories.slice() });
  });

  app.get('/v1/admin/directories/:directoryId', adminAuth, (req: Request, res: Response) => {
    const directoryId = parseIdParam(req.params?.directoryId);
    if (!directoryId) {
      return res.status(400).json({ error: 'Invalid directory id' });
    }
    const store = getAppLocals(app).adminStore;
    const record = store.directories.find((entry) => entry.id === directoryId);
    if (!record) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    return res.json({ data: record });
  });

  app.post('/v1/admin/directories', adminAuth, (req: Request, res: Response) => {
    const validation = validateDirectoryPayload(req.body, 'create');
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    const store = getAppLocals(app).adminStore;
    if (store.directories.some((entry) => entry.slug === validation.value.slug)) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: ['slug already exists'] });
    }
    const categoryCheck = ensureCategoryIdsExist(
      store,
      validation.value.categoryIds ?? [],
      'categoryIds'
    );
    if (!categoryCheck.valid) {
      return res.status(400).json({ error: 'Validation failed', details: categoryCheck.errors });
    }
    const now = new Date().toISOString();
    const record: DirectoryRecord = {
      id: store.nextDirectoryId++,
      title: validation.value.title!,
      slug: validation.value.slug!,
      subdomain: validation.value.subdomain ?? null,
      subdirectory: validation.value.subdirectory ?? null,
      heroTitle: validation.value.heroTitle ?? null,
      heroSubtitle: validation.value.heroSubtitle ?? null,
      introMarkdown: validation.value.introMarkdown ?? null,
      metaTitle: validation.value.metaTitle ?? null,
      metaDescription: validation.value.metaDescription ?? null,
      metaKeywords: validation.value.metaKeywords ?? null,
      ogImageUrl: validation.value.ogImageUrl ?? null,
      status: validation.value.status ?? 'DRAFT',
      locationAgnostic: validation.value.locationAgnostic ?? false,
      categoryIds: validation.value.categoryIds ?? [],
      locationIds: validation.value.locationIds ?? [],
      createdAt: now,
      updatedAt: now
    };
    store.directories.push(record);
    return res.status(201).json({ data: record });
  });

  app.put('/v1/admin/directories/:directoryId', adminAuth, (req: Request, res: Response) => {
    const directoryId = parseIdParam(req.params?.directoryId);
    if (!directoryId) {
      return res.status(400).json({ error: 'Invalid directory id' });
    }
    const store = getAppLocals(app).adminStore;
    const record = store.directories.find((entry) => entry.id === directoryId);
    if (!record) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    const validation = validateDirectoryPayload(req.body, 'update');
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }
    if (
      validation.value.slug &&
      store.directories.some((entry) => entry.slug === validation.value.slug && entry.id !== record.id)
    ) {
      return res
        .status(400)
        .json({ error: 'Validation failed', details: ['slug already exists'] });
    }
    if (validation.value.categoryIds !== undefined) {
      const categoryCheck = ensureCategoryIdsExist(
        store,
        validation.value.categoryIds,
        'categoryIds'
      );
      if (!categoryCheck.valid) {
        return res.status(400).json({ error: 'Validation failed', details: categoryCheck.errors });
      }
      record.categoryIds = validation.value.categoryIds;
    }
    if (validation.value.title !== undefined) {
      record.title = validation.value.title;
    }
    if (validation.value.slug) {
      record.slug = validation.value.slug;
    }
    if (validation.value.subdomain !== undefined) {
      record.subdomain = validation.value.subdomain;
    }
    if (validation.value.subdirectory !== undefined) {
      record.subdirectory = validation.value.subdirectory;
    }
    if (validation.value.heroTitle !== undefined) {
      record.heroTitle = validation.value.heroTitle;
    }
    if (validation.value.heroSubtitle !== undefined) {
      record.heroSubtitle = validation.value.heroSubtitle;
    }
    if (validation.value.introMarkdown !== undefined) {
      record.introMarkdown = validation.value.introMarkdown;
    }
    if (validation.value.metaTitle !== undefined) {
      record.metaTitle = validation.value.metaTitle;
    }
    if (validation.value.metaDescription !== undefined) {
      record.metaDescription = validation.value.metaDescription;
    }
    if (validation.value.metaKeywords !== undefined) {
      record.metaKeywords = validation.value.metaKeywords;
    }
    if (validation.value.ogImageUrl !== undefined) {
      record.ogImageUrl = validation.value.ogImageUrl;
    }
    if (validation.value.status) {
      record.status = validation.value.status;
    }
    if (validation.value.locationAgnostic !== undefined) {
      record.locationAgnostic = validation.value.locationAgnostic;
    }
    if (validation.value.locationIds !== undefined) {
      record.locationIds = validation.value.locationIds;
    }
    record.updatedAt = new Date().toISOString();
    return res.json({ data: record });
  });

  app.delete('/v1/admin/directories/:directoryId', adminAuth, (req: Request, res: Response) => {
    const directoryId = parseIdParam(req.params?.directoryId);
    if (!directoryId) {
      return res.status(400).json({ error: 'Invalid directory id' });
    }
    const store = getAppLocals(app).adminStore;
    const index = store.directories.findIndex((entry) => entry.id === directoryId);
    if (index === -1) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    store.directories.splice(index, 1);
    return res.status(204).json({});
  });
}

function serializeListing(store: AdminStore, record: AdminListingRecord) {
  const addresses = record.addressIds
    .map((addressId) => store.addresses.find((addr) => addr.id === addressId))
    .filter((addr): addr is ListingAddressRecord => Boolean(addr));
  return {
    ...record,
    addresses
  };
}

type CategoryPayloadMode = 'create' | 'update';

interface CategoryPayloadSuccess {
  valid: true;
  value: {
    name?: string;
    slug?: string;
    description?: NullableString;
    metaTitle?: NullableString;
    metaDescription?: NullableString;
    isActive?: boolean;
  };
}

interface CategoryPayloadFailure {
  valid: false;
  errors: string[];
}

type CategoryPayloadResult = CategoryPayloadSuccess | CategoryPayloadFailure;

function validateCategoryPayload(payload: unknown, mode: CategoryPayloadMode): CategoryPayloadResult {
  const errors: string[] = [];
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['Payload must be an object'] };
  }
  const name = sanitizeNullableString(payload.name);
  if (mode === 'create' && !name) {
    errors.push('name is required');
  }
  const slugSource = sanitizeNullableString(payload.slug) ?? name;
  const slug = slugSource ? slugify(slugSource) : null;
  if (mode === 'create' && !slug) {
    errors.push('slug is required');
  } else if (slugSource && !slug) {
    errors.push('slug is invalid');
  }
  const description = sanitizeNullableString(payload.description);
  const metaTitle = sanitizeNullableString(payload.metaTitle);
  const metaDescription = sanitizeNullableString(payload.metaDescription);
  const isActive =
    payload.isActive === undefined
      ? undefined
      : Boolean(payload.isActive);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      name: name ?? undefined,
      slug: slug ?? undefined,
      description,
      metaTitle,
      metaDescription,
      isActive
    }
  };
}

type ListingPayloadMode = 'create' | 'update';

interface ListingPayloadSuccess {
  valid: true;
  value: {
    title?: string;
    slug?: string;
    status?: ListingStatus;
    summary?: NullableString;
    websiteUrl?: NullableString;
    sourceUrl?: NullableString;
    contactEmail?: NullableString;
    notes?: NullableString;
    sourceName?: NullableString;
    categoryIds?: number[];
    addresses?: NormalizedAddressInput[];
  };
}

interface ListingPayloadFailure {
  valid: false;
  errors: string[];
}

type ListingPayloadResult = ListingPayloadSuccess | ListingPayloadFailure;

interface NormalizedAddressInput {
  label: NullableString;
  addressLine1: NullableString;
  addressLine2: NullableString;
  city: NullableString;
  region: NullableString;
  postalCode: NullableString;
  country: NullableString;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

function validateAdminListingPayload(payload: unknown, mode: ListingPayloadMode): ListingPayloadResult {
  const errors: string[] = [];
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['Payload must be an object'] };
  }
  const title = sanitizeNullableString(payload.title);
  if (mode === 'create' && !title) {
    errors.push('title is required');
  }
  const slugSource = sanitizeNullableString(payload.slug) ?? title;
  const slug = slugSource ? slugify(slugSource) : null;
  if (mode === 'create' && !slug) {
    errors.push('slug is required');
  } else if (slugSource && !slug) {
    errors.push('slug is invalid');
  }
  const status = sanitizeListingStatus(payload.status) ?? (mode === 'create' ? 'PENDING' : undefined);
  if (mode === 'create' && !status) {
    errors.push('status is required');
  }
  const websiteUrl = optionalUrl(payload.websiteUrl, 'websiteUrl', errors);
  const sourceUrl = optionalUrl(payload.sourceUrl, 'sourceUrl', errors);
  const contactEmail = optionalEmail(payload.contactEmail, 'contactEmail', errors);
  const summary = sanitizeNullableString(payload.summary);
  const notes = sanitizeNullableString(payload.notes);
  const sourceName = sanitizeNullableString(payload.sourceName);
  const categoryIds =
    payload.categoryIds === undefined
      ? undefined
      : normalizeIdArray(payload.categoryIds, 'categoryIds', errors);
  if (mode === 'create' && (!categoryIds || categoryIds.length === 0)) {
    errors.push('At least one category id is required');
  }
  const addresses = normalizeAddressList(payload.addresses, errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      title: title ?? undefined,
      slug: slug ?? undefined,
      status,
      summary,
      websiteUrl,
      sourceUrl,
      contactEmail,
      notes,
      sourceName,
      categoryIds,
      addresses
    }
  };
}

type DirectoryPayloadMode = 'create' | 'update';

type ListingReviewNormalizationResult =
  | { record: ListingReviewEntry }
  | { errors: string[] };

function normalizeListingReviewEntry(
  entry: unknown,
  index: number
): ListingReviewNormalizationResult {
  if (!isPlainObject(entry)) {
    return { errors: [`listings[${index}] must be an object`] };
  }

  const errors: string[] = [];
  const id = parseIdParam(entry.id);
  if (!id) {
    errors.push(`listings[${index}].id must be a positive integer`);
  }

  let businessName: string | undefined;
  if (entry.businessName !== undefined) {
    const normalized = sanitizeNullableString(entry.businessName);
    if (!normalized) {
      errors.push(`listings[${index}].businessName must be a non-empty string`);
    } else {
      businessName = normalized;
    }
  }

  let website: NullableString | undefined;
  if (entry.website !== undefined || entry.websiteUrl !== undefined) {
    const source = entry.website !== undefined ? entry.website : entry.websiteUrl;
    if (source === null) {
      website = null;
    } else if (typeof source === 'string') {
      const trimmed = source.trim();
      website = trimmed ? trimmed : null;
    } else {
      errors.push(`listings[${index}].website must be a string`);
    }
  }

  let notes: NullableString | undefined;
  if (entry.notes !== undefined) {
    if (entry.notes === null) {
      notes = null;
    } else if (typeof entry.notes === 'string') {
      notes = entry.notes.trim() ? entry.notes.trim() : null;
    } else {
      errors.push(`listings[${index}].notes must be a string`);
    }
  }

  let status: ListingStatus | undefined;
  if (entry.status !== undefined) {
    const normalizedStatus = sanitizeListingStatus(entry.status);
    if (!normalizedStatus) {
      errors.push(`listings[${index}].status is invalid`);
    } else {
      status = normalizedStatus;
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const record: ListingReviewEntry = {
    index,
    id: id!
  };

  if (businessName !== undefined) {
    record.businessName = businessName;
  }
  if (website !== undefined) {
    record.website = website;
  }
  if (notes !== undefined) {
    record.notes = notes;
  }
  if (status !== undefined) {
    record.status = status;
  }

  return { record };
}

interface DirectoryPayloadSuccess {
  valid: true;
  value: {
    title?: string;
    slug?: string;
    subdomain?: NullableString;
    subdirectory?: NullableString;
    heroTitle?: NullableString;
    heroSubtitle?: NullableString;
    introMarkdown?: NullableString;
    metaTitle?: NullableString;
    metaDescription?: NullableString;
    metaKeywords?: NullableString;
    ogImageUrl?: NullableString;
    status?: DirectoryStatus;
    locationAgnostic?: boolean;
    categoryIds?: number[];
    locationIds?: string[];
  };
}

interface DirectoryPayloadFailure {
  valid: false;
  errors: string[];
}

type DirectoryPayloadResult = DirectoryPayloadSuccess | DirectoryPayloadFailure;

function validateDirectoryPayload(payload: unknown, mode: DirectoryPayloadMode): DirectoryPayloadResult {
  const errors: string[] = [];
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['Payload must be an object'] };
  }
  const title = sanitizeNullableString(payload.title);
  if (mode === 'create' && !title) {
    errors.push('title is required');
  }
  const slugSource = sanitizeNullableString(payload.slug) ?? title;
  const slug = slugSource ? slugify(slugSource) : null;
  if (mode === 'create' && !slug) {
    errors.push('slug is required');
  } else if (slugSource && !slug) {
    errors.push('slug is invalid');
  }
  const subdomain = sanitizeNullableString(payload.subdomain);
  const subdirectory = sanitizeNullableString(payload.subdirectory);
  if (mode === 'create' && !subdirectory) {
    errors.push('subdirectory is required');
  }
  const heroTitle = sanitizeNullableString(payload.heroTitle);
  const heroSubtitle = sanitizeNullableString(payload.heroSubtitle);
  const introMarkdown = sanitizeNullableString(payload.introMarkdown);
  const metaTitle = sanitizeNullableString(payload.metaTitle);
  const metaDescription = sanitizeNullableString(payload.metaDescription);
  const metaKeywords = sanitizeNullableString(payload.metaKeywords);
  const ogImageUrl = optionalUrl(payload.ogImageUrl, 'ogImageUrl', errors);
  const locationAgnostic =
    payload.locationAgnostic === undefined ? undefined : Boolean(payload.locationAgnostic);
  const status = sanitizeDirectoryStatus(payload.status) ?? (mode === 'create' ? 'DRAFT' : undefined);
  const categoryIds =
    payload.categoryIds === undefined
      ? undefined
      : normalizeIdArray(payload.categoryIds, 'categoryIds', errors);
  const locationIds =
    payload.locationIds === undefined
      ? undefined
      : normalizeStringArray(payload.locationIds, 'locationIds', errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      title: title ?? undefined,
      slug: slug ?? undefined,
      subdomain,
      subdirectory,
      heroTitle,
      heroSubtitle,
      introMarkdown,
      metaTitle,
      metaDescription,
      metaKeywords,
      ogImageUrl,
      status,
      locationAgnostic,
      categoryIds,
      locationIds
    }
  };
}

interface AddressValidationSuccess {
  valid: true;
  value: {
    label?: NullableString;
    addressLine1?: NullableString;
    addressLine2?: NullableString;
    city?: NullableString;
    region?: NullableString;
    postalCode?: NullableString;
    country?: NullableString;
    latitude?: number | null;
    longitude?: number | null;
    isPrimary?: boolean;
  };
}

interface AddressValidationFailure {
  valid: false;
  errors: string[];
}

type AddressValidationResult = AddressValidationSuccess | AddressValidationFailure;

function validateAddressObject(
  payload: unknown,
  options: { requireDetail?: boolean } = {}
): AddressValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ['Address payload must be an object'] };
  }
  const value: AddressValidationSuccess['value'] = {};
  if ('label' in payload) {
    value.label = sanitizeNullableString(payload.label);
  }
  if ('addressLine1' in payload) {
    value.addressLine1 = sanitizeNullableString(payload.addressLine1);
  }
  if ('addressLine2' in payload) {
    value.addressLine2 = sanitizeNullableString(payload.addressLine2);
  }
  if ('city' in payload) {
    value.city = sanitizeNullableString(payload.city);
  }
  if ('region' in payload) {
    value.region = sanitizeNullableString(payload.region);
  }
  if ('postalCode' in payload) {
    value.postalCode = sanitizeNullableString(payload.postalCode);
  }
  if ('country' in payload) {
    value.country = sanitizeNullableString(payload.country);
  }
  if ('latitude' in payload) {
    value.latitude = parseOptionalNumber(payload.latitude, 'latitude', errors);
  }
  if ('longitude' in payload) {
    value.longitude = parseOptionalNumber(payload.longitude, 'longitude', errors);
  }
  if ('isPrimary' in payload) {
    value.isPrimary = Boolean(payload.isPrimary);
  }
  const hasDetails = hasAddressDetails({
    addressLine1: value.addressLine1 ?? null,
    addressLine2: value.addressLine2 ?? null,
    city: value.city ?? null,
    region: value.region ?? null,
    postalCode: value.postalCode ?? null,
    country: value.country ?? null
  });
  if (options.requireDetail && !hasDetails) {
    errors.push('Address must include at least one location field');
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, value };
}

function normalizeAddressList(value: unknown, errors: string[]): NormalizedAddressInput[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    errors.push('addresses must be an array');
    return undefined;
  }
  const normalized: NormalizedAddressInput[] = [];
  value.forEach((entry, index) => {
    const validation = validateAddressObject(entry, { requireDetail: true });
    if (!validation.valid) {
      validation.errors.forEach((msg) => errors.push(`addresses[${index}]: ${msg}`));
      return;
    }
    const address: NormalizedAddressInput = {
      label: validation.value.label ?? null,
      addressLine1: validation.value.addressLine1 ?? null,
      addressLine2: validation.value.addressLine2 ?? null,
      city: validation.value.city ?? null,
      region: validation.value.region ?? null,
      postalCode: validation.value.postalCode ?? null,
      country: validation.value.country ?? null,
      latitude:
        validation.value.latitude === undefined ? null : validation.value.latitude ?? null,
      longitude:
        validation.value.longitude === undefined ? null : validation.value.longitude ?? null,
      isPrimary: validation.value.isPrimary ?? false
    };
    normalized.push(address);
  });
  return normalized;
}

function ensureCategoryIdsExist(
  store: AdminStore,
  ids: number[],
  fieldName: string
): { valid: boolean; errors?: string[] } {
  const missing = ids.filter((id) => !store.categories.some((category) => category.id === id));
  if (missing.length > 0) {
    return {
      valid: false,
      errors: [`${fieldName} contains invalid category ids: ${missing.join(', ')}`]
    };
  }
  return { valid: true };
}

function replaceListingAddresses(
  store: AdminStore,
  listing: AdminListingRecord,
  addresses: NormalizedAddressInput[]
) {
  store.addresses = store.addresses.filter((address) => address.listingId !== listing.id);
  listing.addressIds = [];
  if (addresses.length === 0) {
    return;
  }
  const normalized = enforcePrimaryAddress(addresses);
  normalized.forEach((entry) => {
    const created = createAddressRecord(store, listing.id, entry);
    listing.addressIds.push(created.id);
  });
  ensurePrimaryAddress(store, listing.id);
}

function enforcePrimaryAddress(addresses: NormalizedAddressInput[]) {
  const hasPrimary = addresses.some((address) => address.isPrimary);
  if (hasPrimary) {
    return addresses.map((address) => ({ ...address }));
  }
  return addresses.map((address, index) => ({
    ...address,
    isPrimary: index === 0
  }));
}

function createAddressRecord(
  store: AdminStore,
  listingId: number,
  address: NormalizedAddressInput
): ListingAddressRecord {
  const now = new Date().toISOString();
  const record: ListingAddressRecord = {
    id: store.nextAddressId++,
    listingId,
    label: address.label ?? null,
    addressLine1: address.addressLine1 ?? null,
    addressLine2: address.addressLine2 ?? null,
    city: address.city ?? null,
    region: address.region ?? null,
    postalCode: address.postalCode ?? null,
    country: address.country ?? 'US',
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    isPrimary: address.isPrimary,
    createdAt: now,
    updatedAt: now
  };
  store.addresses.push(record);
  return record;
}

function normalizeAddressForRecord(
  value: AddressValidationSuccess['value']
): NormalizedAddressInput {
  return {
    label: value.label ?? null,
    addressLine1: value.addressLine1 ?? null,
    addressLine2: value.addressLine2 ?? null,
    city: value.city ?? null,
    region: value.region ?? null,
    postalCode: value.postalCode ?? null,
    country: value.country ?? null,
    latitude: value.latitude === undefined ? null : value.latitude ?? null,
    longitude: value.longitude === undefined ? null : value.longitude ?? null,
    isPrimary: value.isPrimary ?? false
  };
}

function setPrimaryAddress(store: AdminStore, listingId: number, addressId: number) {
  store.addresses.forEach((address) => {
    if (address.listingId === listingId) {
      const isPrimary = address.id === addressId;
      if (address.isPrimary !== isPrimary) {
        address.isPrimary = isPrimary;
        address.updatedAt = new Date().toISOString();
      }
    }
  });
}

function ensurePrimaryAddress(store: AdminStore, listingId: number) {
  const listingAddresses = store.addresses.filter((address) => address.listingId === listingId);
  if (listingAddresses.length === 0) {
    return;
  }
  const currentPrimary = listingAddresses.find((address) => address.isPrimary);
  if (!currentPrimary) {
    listingAddresses[0].isPrimary = true;
    listingAddresses[0].updatedAt = new Date().toISOString();
  }
}

function sanitizeListingStatus(value: unknown): ListingStatus | null {
  if (typeof value !== 'string') {
    return null;
  }
  const upper = value.toUpperCase();
  return ['INACTIVE', 'ACTIVE', 'PENDING', 'APPROVED', 'REJECTED'].includes(upper)
    ? (upper as ListingStatus)
    : null;
}

function sanitizeDirectoryStatus(value: unknown): DirectoryStatus | null {
  if (typeof value !== 'string') {
    return null;
  }
  const upper = value.toUpperCase();
  return ['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(upper) ? (upper as DirectoryStatus) : null;
}

function normalizeIdArray(value: unknown, fieldName: string, errors: string[]): number[] {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
    return [];
  }
  const ids: number[] = [];
  value.forEach((entry, index) => {
    const parsed = parseIdParam(entry);
    if (!parsed) {
      errors.push(`${fieldName}[${index}] must be a positive integer`);
      return;
    }
    if (!ids.includes(parsed)) {
      ids.push(parsed);
    }
  });
  return ids;
}

function normalizeStringArray(value: unknown, fieldName: string, errors: string[]): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array`);
    return [];
  }
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    const normalized = sanitizeNullableString(entry);
    if (!normalized) {
      errors.push(`${fieldName}[${index}] must be a non-empty string`);
      return;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
    }
  });
  return Array.from(seen);
}

function parseOptionalNumber(value: unknown, fieldName: string, errors: string[]): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldName} must be a valid number`);
    return null;
  }
  return parsed;
}

function parseIdParam(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function hasAddressDetails(address: {
  addressLine1: NullableString;
  addressLine2: NullableString;
  city: NullableString;
  region: NullableString;
  postalCode: NullableString;
  country: NullableString;
}) {
  return Boolean(
    address.addressLine1 ||
      address.addressLine2 ||
      address.city ||
      address.region ||
      address.postalCode ||
      address.country
  );
}

function slugify(value: string, maxLength = MAX_SLUG_LENGTH) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeNullableString(value: unknown): NullableString {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalUrl(value: unknown, fieldName: string, errors: string[]): NullableString {
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

function optionalEmail(value: unknown, fieldName: string, errors: string[]): NullableString {
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

function sanitizeLocation(value: unknown): ListingLocation {
  if (!isPlainObject(value)) {
    return null;
  }
  const fields: Array<keyof GeocodingAddress> = [
    'addressLine1',
    'addressLine2',
    'city',
    'region',
    'postalCode',
    'country'
  ];
  const location: Partial<GeocodingAddress> = {};
  fields.forEach((field) => {
    const sanitized = sanitizeNullableString((value as Record<string, unknown>)[field]);
    if (sanitized) {
      location[field] = sanitized;
    }
  });
  return Object.keys(location).length > 0 ? (location as ListingLocation) : null;
}

function getAppLocals(app: Express): AppLocals {
  return app.locals as unknown as AppLocals;
}
