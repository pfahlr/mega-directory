const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { createServer } = require('..');

const baseConfig = Object.freeze({
  adminJwtSecret: 'test-admin-secret',
  adminJwtIssuer: 'mega-directory',
  adminJwtAudience: 'admin',
  adminLoginEmail: 'admin@example.com',
  adminLoginPasscode: 'letmein',
  crawlerBearerToken: 'crawler-token'
});

function findRoute(app, method, path) {
  const stack = (app._router && app._router.stack) || (app.router && app.router.stack) || [];
  const methodName = method.toLowerCase();
  return stack.find(
    (layer) => layer.route && layer.route.path === path && layer.route.methods[methodName]
  );
}

function createRequest({ method = 'GET', headers = {}, body } = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    method,
    headers: normalized,
    body,
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    header(name) {
      return this.get(name);
    }
  };
}

function buildListingPayload(overrides = {}) {
  return {
    title: 'Acme Electric Co.',
    categorySlug: 'electricians',
    websiteUrl: 'https://acme.test',
    sourceUrl: 'https://source.test/acme',
    notes: 'LLM-enriched payload',
    ...overrides
  };
}

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    finished: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.finished = true;
      return this;
    },
    set(field, value) {
      this.headers[field.toLowerCase()] = value;
      return this;
    }
  };
}

function runRoute(route, req, res) {
  if (!route) {
    throw new Error('Route not found');
  }

  for (const layer of route.route.stack) {
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    layer.handle(req, res, next);
    if (!nextCalled || res.finished) {
      break;
    }
  }

  return res;
}

function createStubLogger() {
  const calls = [];
  const logger = {
    calls,
    info(...args) {
      calls.push({ level: 'info', args });
    },
    warn(...args) {
      calls.push({ level: 'warn', args });
    },
    error(...args) {
      calls.push({ level: 'error', args });
    },
    child() {
      return logger;
    }
  };
  return logger;
}

test('health endpoint reports monitoring metadata', () => {
  const app = createServer({ ...baseConfig, logger: createStubLogger() });
  const route = findRoute(app, 'get', '/health');
  const res = runRoute(route, createRequest(), createResponse());

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.ok(typeof res.body.uptime === 'number');
  assert.ok(res.body.timestamp);
  assert.ok(res.body.startedAt);
});

test('admin ping rejects missing token', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'get', '/v1/admin/ping');
  const res = runRoute(route, createRequest(), createResponse());

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Admin token missing or invalid');
});

test('admin ping accepts valid JWT', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'get', '/v1/admin/ping');
  const token = jwt.sign(
    { role: 'admin' },
    baseConfig.adminJwtSecret,
    { issuer: baseConfig.adminJwtIssuer, audience: baseConfig.adminJwtAudience, expiresIn: '5m' }
  );

  const req = createRequest({
    headers: { Authorization: `Bearer ${token}` }
  });
  const res = runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { status: 'admin-ok' });
  assert.strictEqual(req.admin.role, 'admin');
});

test('admin auth route rejects missing credentials', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/admin/auth');
  const res = runRoute(
    route,
    createRequest({ method: 'POST', body: {} }),
    createResponse()
  );

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Invalid admin credentials');
  assert.ok(Array.isArray(res.body.details));
  assert.ok(res.body.details.some((msg) => msg.includes('email')));
  assert.ok(res.body.details.some((msg) => msg.includes('passcode')));
});

test('admin auth route rejects invalid credentials', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/admin/auth');
  const res = runRoute(
    route,
    createRequest({
      method: 'POST',
      body: { email: 'admin@example.com', passcode: 'wrong-pass' }
    }),
    createResponse()
  );

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Invalid admin credentials');
});

test('admin auth issues JWTs that unlock protected routes', () => {
  const app = createServer(baseConfig);
  const authRoute = findRoute(app, 'post', '/v1/admin/auth');
  const loginRes = runRoute(
    authRoute,
    createRequest({
      method: 'POST',
      body: { email: baseConfig.adminLoginEmail, passcode: baseConfig.adminLoginPasscode }
    }),
    createResponse()
  );

  assert.strictEqual(loginRes.statusCode, 200);
  assert.strictEqual(typeof loginRes.body.token, 'string');
  assert.strictEqual(loginRes.body.tokenType, 'Bearer');
  assert.strictEqual(loginRes.body.expiresIn, 900);

  const decoded = jwt.verify(loginRes.body.token, baseConfig.adminJwtSecret, {
    issuer: baseConfig.adminJwtIssuer,
    audience: baseConfig.adminJwtAudience
  });
  assert.strictEqual(decoded.role, 'admin');
  assert.strictEqual(decoded.sub, baseConfig.adminLoginEmail.toLowerCase());

  const pingRoute = findRoute(app, 'get', '/v1/admin/ping');
  const pingRes = runRoute(
    pingRoute,
    createRequest({ headers: { Authorization: `Bearer ${loginRes.body.token}` } }),
    createResponse()
  );

  assert.strictEqual(pingRes.statusCode, 200);
  assert.deepStrictEqual(pingRes.body, { status: 'admin-ok' });
});

test('crawler ping rejects invalid bearer token', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/ping');
  const res = runRoute(
    route,
    createRequest({ method: 'POST', headers: { Authorization: 'Bearer wrong-token' } }),
    createResponse()
  );

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Crawler token missing or invalid');
});

test('crawler ping accepts matching bearer token', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/ping');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` }
  });
  const res = runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { status: 'crawler-ok' });
});

test('crawler listing ingestion rejects missing bearer token', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    body: buildListingPayload()
  });
  const res = runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Crawler token missing or invalid');
});

test('crawler listing ingestion stores sanitized listings as inactive', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: buildListingPayload({ slug: 'ACME Electric!!', summary: 'Trusted' })
  });
  const res = runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 202);
  assert.strictEqual(res.body.ingestedCount, 1);
  assert.ok(Array.isArray(res.body.ingested));
  const [storedSummary] = res.body.ingested;
  assert.strictEqual(storedSummary.status, 'INACTIVE');
  assert.strictEqual(storedSummary.title, 'Acme Electric Co.');
  assert.strictEqual(storedSummary.slug, 'acme-electric');

  const store = app.locals.ingestionStore;
  const all = store.all();
  assert.strictEqual(all.length, 1);
  assert.strictEqual(all[0].status, 'INACTIVE');
  assert.strictEqual(all[0].slug, 'acme-electric');
  assert.strictEqual(all[0].title, 'Acme Electric Co.');
  assert.strictEqual(all[0].rawPayload.title, 'Acme Electric Co.');
  assert.ok(Date.parse(all[0].ingestedAt));
});

test('crawler listing ingestion accepts batches and reports metadata', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const payload = {
    listings: [
      buildListingPayload({ title: 'Bright Builders', categorySlug: 'builders' }),
      buildListingPayload({ title: 'Northern Lights', categorySlug: 'photographers', slug: null })
    ]
  };
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: payload
  });
  const res = runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 202);
  assert.strictEqual(res.body.ingestedCount, 2);
  assert.strictEqual(res.body.ingested[0].title, 'Bright Builders');
  assert.strictEqual(res.body.ingested[0].slug, 'bright-builders');
  assert.strictEqual(res.body.ingested[1].slug, 'northern-lights');
  assert.ok(Date.parse(res.body.ingested[1].ingestedAt));

  const records = app.locals.ingestionStore.all();
  assert.strictEqual(records.length, 2);
  assert.strictEqual(records[0].categorySlug, 'builders');
  assert.strictEqual(records[1].categorySlug, 'photographers');
});

test('crawler listing ingestion logs batch summary', () => {
  const logger = createStubLogger();
  const app = createServer({ ...baseConfig, logger });
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: buildListingPayload({ slug: null })
  });

  runRoute(route, req, createResponse());

  const infoLog = logger.calls.find((entry) => entry.level === 'info');
  assert.ok(infoLog, 'expected ingestion handler to log summary');
  const [metadata] = infoLog.args;
  assert.strictEqual(metadata.event, 'listings.ingested');
  assert.strictEqual(metadata.ingestedCount, 1);
  assert.deepStrictEqual(metadata.categories, ['electricians']);
});

test('crawler listing ingestion validates payload shape and reports errors', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const payload = {
    listings: [
      buildListingPayload({ title: '  ', categorySlug: 'electricians' }),
      { title: 'Missing category' }
    ]
  };
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: payload
  });
  const res = runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Invalid listing payload');
  assert.ok(Array.isArray(res.body.details));
  assert.strictEqual(res.body.details.length, 2);
  assert.strictEqual(res.body.details[0].index, 0);
  assert.ok(res.body.details[0].messages.some((msg) => msg.includes('title')));
  assert.ok(res.body.details[1].messages.some((msg) => msg.includes('categorySlug')));
  assert.strictEqual(app.locals.ingestionStore.all().length, 0);
});

test('createServer enforces required configuration', () => {
  assert.throws(() => {
    createServer({ crawlerBearerToken: 'only-crawler' });
  }, /Missing required config value/);

  assert.throws(() => {
    createServer({ adminJwtSecret: 'only-admin' });
  }, /Missing required config value/);
});
