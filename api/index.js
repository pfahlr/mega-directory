const express = require('express');
const jwt = require('jsonwebtoken');

const DEFAULT_PORT = 3001;

function resolveConfig(overrides = {}) {
  const parsedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const envPort = Number.isNaN(parsedPort) ? undefined : parsedPort;
  const baseConfig = {
    port: overrides.port ?? envPort ?? DEFAULT_PORT,
    adminJwtSecret: overrides.adminJwtSecret ?? process.env.ADMIN_JWT_SECRET,
    adminJwtIssuer: overrides.adminJwtIssuer ?? process.env.ADMIN_JWT_ISSUER ?? 'mega-directory',
    adminJwtAudience: overrides.adminJwtAudience ?? process.env.ADMIN_JWT_AUDIENCE ?? 'admin',
    crawlerBearerToken: overrides.crawlerBearerToken ?? process.env.CRAWLER_BEARER_TOKEN
  };

  const missing = [];
  if (!baseConfig.adminJwtSecret) {
    missing.push('ADMIN_JWT_SECRET');
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

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/v1/admin/ping', requireAdminAuth(config), (_req, res) => {
    res.json({ status: 'admin-ok' });
  });

  app.post('/v1/crawler/ping', requireCrawlerToken(config), (_req, res) => {
    res.json({ status: 'crawler-ok' });
  });

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
