const test = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { createServer } = require('..');

const baseConfig = Object.freeze({
  adminJwtSecret: 'test-admin-secret',
  adminJwtIssuer: 'mega-directory',
  adminJwtAudience: 'admin',
  crawlerBearerToken: 'crawler-token'
});

function findRoute(app, method, path) {
  const stack = (app._router && app._router.stack) || (app.router && app.router.stack) || [];
  const methodName = method.toLowerCase();
  return stack.find(
    (layer) => layer.route && layer.route.path === path && layer.route.methods[methodName]
  );
}

function createRequest({ method = 'GET', headers = {} } = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    method,
    headers: normalized,
    get(name) {
      return this.headers[name.toLowerCase()];
    },
    header(name) {
      return this.get(name);
    }
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

test('health endpoint reports ok', () => {
  const app = createServer(baseConfig);
  const route = findRoute(app, 'get', '/health');
  const res = runRoute(route, createRequest(), createResponse());

  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(res.body, { status: 'ok' });
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

test('createServer enforces required configuration', () => {
  assert.throws(() => {
    createServer({ crawlerBearerToken: 'only-crawler' });
  }, /Missing required config value/);

  assert.throws(() => {
    createServer({ adminJwtSecret: 'only-admin' });
  }, /Missing required config value/);
});
