const test = require('node:test');
const assert = require('node:assert/strict');

const apiClient = require('../services/apiClient');
const directoryService = require('../services/directoryPageService');
const { ApiClientError } = require('../services/apiClient');

function stubApi(method, implementation) {
  const original = apiClient[method];
  apiClient[method] = implementation;
  return () => {
    apiClient[method] = original;
  };
}

test('createDirectoryPage normalizes form input before calling the API', async () => {
  let capturedPayload = null;
  const restore = stubApi('createDirectory', async (payload) => {
    capturedPayload = payload;
    return { id: 10, ...payload };
  });
  const restoreOptions = stubApi('fetchCategories', async () => [{ id: 5, name: 'Electricians' }]);

  const result = await directoryService.createDirectoryPage({
    title: '  Remote Support Specialists ',
    categoryId: '5',
    locationId: 'loc_remote_nationwide',
    locationAgnostic: '0',
    subdomain: ' remote-support ',
    subdirectory: '  remote/support ',
    heroTitle: ' Hero ',
    heroSubtitle: ' Subtitle ',
    introMarkdown: ' Overview ',
    metaTitle: ' Meta ',
    metaDescription: ' Description ',
    metaKeywords: ' support,remote ',
    ogImageUrl: ' https://cdn.example.com/remote.png ',
    status: 'active'
  });

  restore();
  restoreOptions();

  assert.ifError(result.errors);
  assert.ok(result.record);
  assert.strictEqual(capturedPayload.title, 'Remote Support Specialists');
  assert.strictEqual(capturedPayload.slug, 'remote-support');
  assert.strictEqual(capturedPayload.subdomain, 'remote-support');
  assert.strictEqual(capturedPayload.subdirectory, 'remote/support');
  assert.deepStrictEqual(capturedPayload.categoryIds, [5]);
  assert.deepStrictEqual(capturedPayload.locationIds, ['loc_remote_nationwide']);
  assert.strictEqual(capturedPayload.status, 'ACTIVE');
});

test('createDirectoryPage rejects missing required fields', async () => {
  const restore = stubApi('fetchCategories', async () => [{ id: 1, name: 'Electricians' }]);
  let wasCalled = false;
  const restoreCreate = stubApi('createDirectory', async () => {
    wasCalled = true;
    return {};
  });

  const result = await directoryService.createDirectoryPage({
    title: '',
    categoryId: '',
    subdomain: '',
    subdirectory: '',
    metaTitle: '',
    metaDescription: ''
  });

  restore();
  restoreCreate();

  assert.ok(result.errors);
  assert.strictEqual(wasCalled, false);
  assert.ok(result.errors.title);
  assert.ok(result.errors.categoryId);
  assert.ok(result.errors.subdomain);
  assert.ok(result.errors.subdirectory);
  assert.ok(result.errors.metaTitle);
  assert.ok(result.errors.metaDescription);
});

test('updateDirectoryPage surfaces API validation errors', async () => {
  const restoreCategories = stubApi('fetchCategories', async () => [{ id: 2, name: 'Plumbers' }]);
  const restoreUpdate = stubApi('updateDirectory', async () => {
    throw new ApiClientError('Validation failed', {
      status: 400,
      payload: { error: 'Validation failed', details: ['slug already exists'] }
    });
  });

  const result = await directoryService.updateDirectoryPage(3, {
    title: 'Updated title',
    categoryId: '2',
    subdomain: 'updated-sub',
    subdirectory: 'updated/path',
    locationId: 'loc_remote_nationwide',
    metaTitle: 'Meta',
    metaDescription: 'Description'
  });

  restoreCategories();
  restoreUpdate();

  assert.ok(result.errors);
  assert.ok(result.errors.form);
  assert.match(result.errors.form, /slug already exists/);
});
