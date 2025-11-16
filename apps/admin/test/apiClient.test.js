const test = require('node:test');
const assert = require('node:assert/strict');

const apiClient = require('../services/apiClient');

const originalFetch = global.fetch;
const originalEnv = {
  baseUrl: process.env.ADMIN_API_BASE_URL,
  fallbackUrl: process.env.API_BASE_URL,
  token: process.env.ADMIN_API_TOKEN
};

function mockFetch(response) {
  const calls = [];
  global.fetch = async (input, init = {}) => {
    calls.push({ input, init });
    if (response.error) {
      throw response.error;
    }
    return {
      ok: response.ok !== undefined ? response.ok : true,
      status: response.status ?? (response.ok === false ? 500 : 200),
      json: async () => response.body
    };
  };
  return {
    calls,
    restore() {
      global.fetch = originalFetch;
    }
  };
}

function withEnv() {
  process.env.ADMIN_API_BASE_URL = 'https://api.example.com';
  process.env.API_BASE_URL = '';
  process.env.ADMIN_API_TOKEN = 'secret';
}

test('fetchDirectories retrieves admin directories via API', async (t) => {
  withEnv();
  const mock = mockFetch({ body: { data: [{ id: 1, title: 'Test Directory' }] } });
  t.after(() => {
    mock.restore();
    process.env.ADMIN_API_BASE_URL = originalEnv.baseUrl;
    process.env.API_BASE_URL = originalEnv.fallbackUrl;
    process.env.ADMIN_API_TOKEN = originalEnv.token;
  });

  const directories = await apiClient.fetchDirectories();

  assert.deepStrictEqual(directories, [{ id: 1, title: 'Test Directory' }]);
  assert.strictEqual(mock.calls.length, 1);
  assert.strictEqual(mock.calls[0].input, 'https://api.example.com/v1/admin/directories');
  assert.strictEqual(mock.calls[0].init.method, 'GET');
  assert.strictEqual(mock.calls[0].init.headers.Authorization, 'Bearer secret');
});

test('createDirectory sends payloads via POST', async (t) => {
  withEnv();
  const payload = { title: 'Austin Plumbers', slug: 'austin-plumbers' };
  const mock = mockFetch({ body: { data: { id: 42, ...payload } } });
  t.after(() => {
    mock.restore();
    process.env.ADMIN_API_BASE_URL = originalEnv.baseUrl;
    process.env.API_BASE_URL = originalEnv.fallbackUrl;
    process.env.ADMIN_API_TOKEN = originalEnv.token;
  });

  const created = await apiClient.createDirectory(payload);
  assert.strictEqual(created.id, 42);
  assert.strictEqual(mock.calls.length, 1);
  assert.strictEqual(mock.calls[0].init.method, 'POST');
  assert.strictEqual(mock.calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepStrictEqual(JSON.parse(mock.calls[0].init.body), payload);
});

test('API client propagates HTTP errors as ApiClientError', async (t) => {
  withEnv();
  const mock = mockFetch({
    ok: false,
    status: 400,
    body: { error: 'Validation failed', details: ['slug already exists'] }
  });
  t.after(() => {
    mock.restore();
    process.env.ADMIN_API_BASE_URL = originalEnv.baseUrl;
    process.env.API_BASE_URL = originalEnv.fallbackUrl;
    process.env.ADMIN_API_TOKEN = originalEnv.token;
  });

  await assert.rejects(
    () => apiClient.createDirectory({ title: 'Dup', slug: 'dup' }),
    (error) => {
      assert.strictEqual(error.name, 'ApiClientError');
      assert.strictEqual(error.status, 400);
      assert.deepStrictEqual(error.payload, { error: 'Validation failed', details: ['slug already exists'] });
      return true;
    }
  );
});
