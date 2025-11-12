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

const nativeFetch = global.fetch;

function createFetchMock(responses = []) {
  const queue = responses.slice();
  const calls = [];

  global.fetch = async (input, init = {}) => {
    calls.push({ input, init });
    if (queue.length === 0) {
      throw new Error('Unexpected fetch call');
    }
    const next = queue.shift();
    if (next.error) {
      throw next.error;
    }
    const ok = next.ok !== undefined ? next.ok : true;
    const status = next.status ?? (ok ? 200 : 500);
    const body = next.body ?? null;
    return {
      ok,
      status,
      json: async () => body,
      text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
    };
  };

  return {
    calls,
    restore() {
      global.fetch = nativeFetch;
    }
  };
}

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

function buildLocation(overrides = {}) {
  return {
    addressLine1: '123 Broadway',
    city: 'New York',
    region: 'NY',
    postalCode: '10007',
    country: 'USA',
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

async function runRoute(route, req, res) {
  if (!route) {
    throw new Error('Route not found');
  }

  for (const layer of route.route.stack) {
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    const result = layer.handle(req, res, next);
    if (result && typeof result.then === 'function') {
      await result;
    }
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

function createAdminToken(config = baseConfig, overrides = {}) {
  const secret = overrides.adminJwtSecret ?? config.adminJwtSecret;
  const issuer = overrides.adminJwtIssuer ?? config.adminJwtIssuer;
  const audience = overrides.adminJwtAudience ?? config.adminJwtAudience;
  return jwt.sign(
    { role: 'admin', sub: (config.adminLoginEmail || '').toLowerCase() || 'admin' },
    secret,
    { issuer, audience, expiresIn: '10m' }
  );
}

test('health endpoint reports monitoring metadata', async () => {
  const app = createServer({ ...baseConfig, logger: createStubLogger() });
  const route = findRoute(app, 'get', '/health');
  const res = await runRoute(route, createRequest(), createResponse());

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'ok');
  assert.ok(typeof res.body.uptime === 'number');
  assert.ok(res.body.timestamp);
  assert.ok(res.body.startedAt);
});

test('admin ping rejects missing token', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'get', '/v1/admin/ping');
  const res = await runRoute(route, createRequest(), createResponse());

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Admin token missing or invalid');
});

test('admin ping accepts valid JWT', async () => {
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
  const res = await runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { status: 'admin-ok' });
  assert.strictEqual(req.admin.role, 'admin');
});

test('admin auth route rejects missing credentials', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/admin/auth');
  const res = await runRoute(
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

test('admin auth route rejects invalid credentials', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/admin/auth');
  const res = await runRoute(
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

test('admin auth issues JWTs that unlock protected routes', async () => {
  const app = createServer(baseConfig);
  const authRoute = findRoute(app, 'post', '/v1/admin/auth');
  const loginRes = await runRoute(
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
  const pingRes = await runRoute(
    pingRoute,
    createRequest({ headers: { Authorization: `Bearer ${loginRes.body.token}` } }),
    createResponse()
  );

  assert.strictEqual(pingRes.statusCode, 200);
  assert.deepStrictEqual(pingRes.body, { status: 'admin-ok' });
});

test('crawler ping rejects invalid bearer token', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/ping');
  const res = await runRoute(
    route,
    createRequest({ method: 'POST', headers: { Authorization: 'Bearer wrong-token' } }),
    createResponse()
  );

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Crawler token missing or invalid');
});

test('crawler ping accepts matching bearer token', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/ping');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` }
  });
  const res = await runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { status: 'crawler-ok' });
});

test('crawler listing ingestion rejects missing bearer token', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    body: buildListingPayload()
  });
  const res = await runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Crawler token missing or invalid');
});

test('crawler listing ingestion stores sanitized listings as inactive', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: buildListingPayload({ slug: 'ACME Electric!!', summary: 'Trusted' })
  });
  const res = await runRoute(route, req, createResponse());

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

test('crawler listing ingestion geocodes addresses via geocode maps', async () => {
  const mockFetch = createFetchMock([
    {
      body: [
        {
          lat: '40.7128',
          lon: '-74.0060'
        }
      ]
    }
  ]);
  const app = createServer({
    ...baseConfig,
    geocodeMapsApiKey: 'maps-key',
    googleGeocodeApiKey: 'google-key'
  });
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: buildListingPayload({ location: buildLocation() })
  });

  try {
    const res = await runRoute(route, req, createResponse());
    assert.strictEqual(res.statusCode, 202);
    assert.strictEqual(mockFetch.calls.length, 1);
    assert.ok(String(mockFetch.calls[0].input).includes('geocode.maps.co'));
    const [record] = app.locals.ingestionStore.all();
    assert.ok(record.location, 'expected location to be stored');
    assert.strictEqual(record.location.latitude, 40.7128);
    assert.strictEqual(record.location.longitude, -74.006);
  } finally {
    mockFetch.restore();
  }
});

test('crawler listing ingestion falls back to google geocode when primary fails', async () => {
  const mockFetch = createFetchMock([
    { body: [] },
    {
      body: {
        status: 'OK',
        results: [
          {
            geometry: {
              location: { lat: 47.6062, lng: -122.3321 }
            }
          }
        ]
      }
    }
  ]);
  const app = createServer({
    ...baseConfig,
    geocodeMapsApiKey: 'maps-key',
    googleGeocodeApiKey: 'google-key'
  });
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: buildListingPayload({ location: buildLocation({ city: 'Seattle', region: 'WA' }) })
  });

  try {
    const res = await runRoute(route, req, createResponse());
    assert.strictEqual(res.statusCode, 202);
    assert.strictEqual(mockFetch.calls.length, 2);
    assert.ok(String(mockFetch.calls[0].input).includes('geocode.maps.co'));
    assert.ok(String(mockFetch.calls[1].input).includes('maps.googleapis.com'));
    const [record] = app.locals.ingestionStore.all();
    assert.strictEqual(record.location.latitude, 47.6062);
    assert.strictEqual(record.location.longitude, -122.3321);
  } finally {
    mockFetch.restore();
  }
});

test('crawler listing ingestion keeps processing when geocoding fails', async () => {
  const mockFetch = createFetchMock([
    { error: new Error('network down') },
    {
      body: {
        status: 'ZERO_RESULTS',
        results: []
      }
    }
  ]);
  const app = createServer({
    ...baseConfig,
    geocodeMapsApiKey: 'maps-key',
    googleGeocodeApiKey: 'google-key'
  });
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: buildListingPayload({ location: buildLocation({ city: 'Austin', region: 'TX' }) })
  });

  try {
    const res = await runRoute(route, req, createResponse());
    assert.strictEqual(res.statusCode, 202);
    assert.strictEqual(mockFetch.calls.length, 2);
    const [record] = app.locals.ingestionStore.all();
    assert.ok(record.location);
    assert.strictEqual(record.location.latitude, undefined);
    assert.strictEqual(record.location.longitude, undefined);
  } finally {
    mockFetch.restore();
  }
});

test('crawler listing ingestion accepts batches and reports metadata', async () => {
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
  const res = await runRoute(route, req, createResponse());

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

test('crawler listing ingestion logs batch summary', async () => {
  const logger = createStubLogger();
  const app = createServer({ ...baseConfig, logger });
  const route = findRoute(app, 'post', '/v1/crawler/listings');
  const req = createRequest({
    method: 'POST',
    headers: { Authorization: `Bearer ${baseConfig.crawlerBearerToken}` },
    body: buildListingPayload({ slug: null })
  });

  await runRoute(route, req, createResponse());

  const infoLog = logger.calls.find((entry) => entry.level === 'info');
  assert.ok(infoLog, 'expected ingestion handler to log summary');
  const [metadata] = infoLog.args;
  assert.strictEqual(metadata.event, 'listings.ingested');
  assert.strictEqual(metadata.ingestedCount, 1);
  assert.deepStrictEqual(metadata.categories, ['electricians']);
});

test('crawler listing ingestion validates payload shape and reports errors', async () => {
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
  const res = await runRoute(route, req, createResponse());

  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'Invalid listing payload');
  assert.ok(Array.isArray(res.body.details));
  assert.strictEqual(res.body.details.length, 2);
  assert.strictEqual(res.body.details[0].index, 0);
  assert.ok(res.body.details[0].messages.some((msg) => msg.includes('title')));
  assert.ok(res.body.details[1].messages.some((msg) => msg.includes('categorySlug')));
  assert.strictEqual(app.locals.ingestionStore.all().length, 0);
});

test('createServer enforces required configuration', async () => {
  assert.throws(() => {
    createServer({ crawlerBearerToken: 'only-crawler' });
  }, /Missing required config value/);

  assert.throws(() => {
    createServer({ adminJwtSecret: 'only-admin' });
  }, /Missing required config value/);
});

test('admin categories endpoints enforce auth', async () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'get', '/v1/admin/categories');
  const res = await runRoute(route, createRequest(), createResponse());

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.error, 'Admin token missing or invalid');
});

test('admin categories support CRUD with slug normalization', async () => {
  const app = createServer(baseConfig);
  const token = createAdminToken(baseConfig);

  const listRoute = findRoute(app, 'get', '/v1/admin/categories');
  const listRes = await runRoute(
    listRoute,
    createRequest({ headers: { Authorization: `Bearer ${token}` } }),
    createResponse()
  );
  assert.ok(Array.isArray(listRes.body.data));
  assert.ok(listRes.body.data.length >= 2);

  const createRoute = findRoute(app, 'post', '/v1/admin/categories');
  const createRes = await runRoute(
    createRoute,
    createRequest({
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: '  Solar Pros  ', description: 'Certified solar partners' }
    }),
    createResponse()
  );

  assert.strictEqual(createRes.statusCode, 201);
  assert.strictEqual(createRes.body.data.slug, 'solar-pros');
  assert.strictEqual(createRes.body.data.name, 'Solar Pros');
  const createdId = createRes.body.data.id;

  const detailRoute = findRoute(app, 'get', '/v1/admin/categories/:categoryId');
  const detailReq = createRequest({ headers: { Authorization: `Bearer ${token}` } });
  detailReq.params = { categoryId: String(createdId) };
  const detailRes = await runRoute(detailRoute, detailReq, createResponse());
  assert.strictEqual(detailRes.statusCode, 200);
  assert.strictEqual(detailRes.body.data.id, createdId);

  const updateRoute = findRoute(app, 'put', '/v1/admin/categories/:categoryId');
  const updateReq = createRequest({
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: { metaTitle: 'Updated Title', slug: 'solar-pros-custom' }
  });
  updateReq.params = { categoryId: String(createdId) };
  const updateRes = await runRoute(updateRoute, updateReq, createResponse());
  assert.strictEqual(updateRes.statusCode, 200);
  assert.strictEqual(updateRes.body.data.metaTitle, 'Updated Title');
  assert.strictEqual(updateRes.body.data.slug, 'solar-pros-custom');

  const deleteRoute = findRoute(app, 'delete', '/v1/admin/categories/:categoryId');
  const deleteReq = createRequest({
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  deleteReq.params = { categoryId: String(createdId) };
  const deleteRes = await runRoute(deleteRoute, deleteReq, createResponse());
  assert.strictEqual(deleteRes.statusCode, 204);

  const afterDeleteDetailReq = createRequest({ headers: { Authorization: `Bearer ${token}` } });
  afterDeleteDetailReq.params = { categoryId: String(createdId) };
  const afterDeleteDetailRes = await runRoute(
    detailRoute,
    afterDeleteDetailReq,
    createResponse()
  );
  assert.strictEqual(afterDeleteDetailRes.statusCode, 404);
});

test('admin listings support nested addresses and propagate to addresses endpoints', async () => {
  const app = createServer(baseConfig);
  const token = createAdminToken(baseConfig);

  const categoriesRoute = findRoute(app, 'get', '/v1/admin/categories');
  const categoriesRes = await runRoute(
    categoriesRoute,
    createRequest({ headers: { Authorization: `Bearer ${token}` } }),
    createResponse()
  );
  const [firstCategory, secondCategory] = categoriesRes.body.data;
  assert.ok(firstCategory);
  assert.ok(secondCategory);

  const createRoute = findRoute(app, 'post', '/v1/admin/listings');
  const createRes = await runRoute(
    createRoute,
    createRequest({
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Atlas Electric',
        summary: '24/7 electricians',
        websiteUrl: 'https://atlas.example.com',
        contactEmail: 'info@atlas.example.com',
        status: 'PENDING',
        categoryIds: [firstCategory.id],
        addresses: [
          {
            label: 'HQ',
            addressLine1: '123 5th Ave',
            city: 'New York',
            region: 'NY',
            postalCode: '10010',
            country: 'US',
            isPrimary: true
          },
          {
            label: 'Shop',
            addressLine1: '456 Atlantic Ave',
            city: 'Brooklyn',
            region: 'NY',
            postalCode: '11201',
            country: 'US'
          }
        ]
      }
    }),
    createResponse()
  );

  assert.strictEqual(createRes.statusCode, 201);
  assert.strictEqual(createRes.body.data.slug, 'atlas-electric');
  assert.strictEqual(createRes.body.data.categoryIds[0], firstCategory.id);
  assert.strictEqual(createRes.body.data.addresses.length, 2);
  assert.ok(createRes.body.data.addresses.every((addr) => addr.listingId === createRes.body.data.id));

  const addressesRoute = findRoute(app, 'get', '/v1/admin/addresses');
  const addressesRes = await runRoute(
    addressesRoute,
    createRequest({ headers: { Authorization: `Bearer ${token}` } }),
    createResponse()
  );
  const linkedAddresses = addressesRes.body.data.filter(
    (entry) => entry.listingId === createRes.body.data.id
  );
  assert.strictEqual(linkedAddresses.length, 2);
  assert.ok(linkedAddresses.some((entry) => entry.isPrimary));

  const updateListingRoute = findRoute(app, 'put', '/v1/admin/listings/:listingId');
  const updateReq = createRequest({
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: { status: 'APPROVED', categoryIds: [firstCategory.id, secondCategory.id] }
  });
  updateReq.params = { listingId: String(createRes.body.data.id) };
  const updateRes = await runRoute(updateListingRoute, updateReq, createResponse());
  assert.strictEqual(updateRes.body.data.status, 'APPROVED');
  assert.strictEqual(updateRes.body.data.categoryIds.length, 2);

  const deleteRoute = findRoute(app, 'delete', '/v1/admin/listings/:listingId');
  const deleteReq = createRequest({
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  deleteReq.params = { listingId: String(createRes.body.data.id) };
  const deleteRes = await runRoute(deleteRoute, deleteReq, createResponse());
  assert.strictEqual(deleteRes.statusCode, 204);

  const addressesAfterDelete = await runRoute(
    addressesRoute,
    createRequest({ headers: { Authorization: `Bearer ${token}` } }),
    createResponse()
  );
  assert.ok(!addressesAfterDelete.body.data.some((addr) => addr.listingId === createRes.body.data.id));
});

test('admin directories support creation and updates with category validation', async () => {
  const app = createServer(baseConfig);
  const token = createAdminToken(baseConfig);

  const categoriesRoute = findRoute(app, 'get', '/v1/admin/categories');
  const categoriesRes = await runRoute(
    categoriesRoute,
    createRequest({ headers: { Authorization: `Bearer ${token}` } }),
    createResponse()
  );
  const [primaryCategory] = categoriesRes.body.data;
  assert.ok(primaryCategory, 'expected seeded categories');

  const createRoute = findRoute(app, 'post', '/v1/admin/directories');
  const createRes = await runRoute(
    createRoute,
    createRequest({
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        title: 'Remote Support Pros',
        locationAgnostic: true,
        subdomain: 'support',
        subdirectory: 'global/support',
        heroTitle: 'Remote Support',
        heroSubtitle: 'Top distributed teams',
        introMarkdown: '**Remote-first** partners',
        metaTitle: 'Remote Support Pros',
        metaDescription: 'Trusted remote teams',
        categoryIds: [primaryCategory.id],
        locationIds: ['global']
      }
    }),
    createResponse()
  );

  assert.strictEqual(createRes.statusCode, 201);
  assert.strictEqual(createRes.body.data.slug, 'remote-support-pros');
  assert.deepStrictEqual(createRes.body.data.categoryIds, [primaryCategory.id]);
  assert.deepStrictEqual(createRes.body.data.locationIds, ['global']);

  const updateRoute = findRoute(app, 'put', '/v1/admin/directories/:directoryId');
  const updateReq = createRequest({
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      status: 'ACTIVE',
      metaDescription: 'Expanded coverage',
      categoryIds: [],
      locationIds: ['north-america', 'global']
    }
  });
  updateReq.params = { directoryId: String(createRes.body.data.id) };
  const updateRes = await runRoute(updateRoute, updateReq, createResponse());
  assert.strictEqual(updateRes.statusCode, 200);
  assert.strictEqual(updateRes.body.data.status, 'ACTIVE');
  assert.deepStrictEqual(updateRes.body.data.locationIds, ['north-america', 'global']);
  assert.deepStrictEqual(updateRes.body.data.categoryIds, []);
});
