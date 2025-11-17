import express, { type Express } from 'express';
import { DEFAULT_PORTS, PROJECT_NAME } from '@mega-directory/config';
import { createLogger, createRequestLogger, type Logger } from './logger';
import { initializePrisma, disconnectPrisma } from './db';
import { initializeRedis, disconnectRedis, type CacheConfig } from './cache';
import { errorHandler } from './middleware/errorHandler';
import { createAdminRouter } from './routes/admin';
import { createPublicRouter } from './routes/public';
import { createCrawlerRouter } from './routes/crawler';
import type { AuthConfig } from './middleware/auth';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const DEFAULT_PORT = DEFAULT_PORTS.api;
const DEFAULT_ADMIN_TOKEN_TTL_SECONDS = 60 * 15;

export interface ServerConfig extends AuthConfig {
  port: number;
  adminLoginEmail: string;
  adminLoginPasscode: string;
  adminTokenTtlSeconds: number;
  geocodeMapsApiKey: string;
  googleGeocodeApiKey: string;
  cache: CacheConfig;
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
  logger: Logger;
  health: HealthState;
}

/**
 * Resolve server configuration from environment and overrides
 */
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
    googleGeocodeApiKey: overrides.googleGeocodeApiKey ?? process.env.GOOGLEMAPS_API_KEY ?? '',
    cache: overrides.cache ?? {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: Number.parseInt(process.env.REDIS_DB ?? '0', 10),
      keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'mega-directory:',
      enabled: process.env.REDIS_ENABLED === 'true'
    }
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

/**
 * Create Express application with all routes and middleware
 */
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
  const locals = app.locals as unknown as AppLocals;

  locals.config = config;
  locals.logger = logger;
  locals.health = { startedAt: new Date() };

  // Global middleware
  app.use(createRequestLogger(logger));
  app.use(express.json());

  // API Documentation
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') {
    app.use('/api-docs', ...swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Mega Directory API Docs',
    }));
    logger.info('API documentation available at /api-docs');
  }

  // Health check
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

  // API routes
  app.use('/v1/admin', createAdminRouter(config));
  app.use('/v1', createPublicRouter());
  app.use('/v1/crawler', createCrawlerRouter(config));

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
export function startServer() {
  const app = createServer();
  const locals = app.locals as unknown as AppLocals;
  const { port, cache } = locals.config;

  // Initialize database and cache connections
  initializePrisma()
    .then(() => {
      // Initialize Redis cache
      initializeRedis(cache, locals.logger);

      app.listen(port, () => {
        locals.logger.info(
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
    await disconnectRedis();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await disconnectPrisma();
    await disconnectRedis();
    process.exit(0);
  });
}

if (require.main === module) {
  startServer();
}
