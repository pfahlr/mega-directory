const test = require('node:test');
const assert = require('node:assert');

const listingsStore = require('../data/listings');
const apiClient = require('../services/apiClient');
const { getListings, updateListings } = require('../services/listingsService');

const originalListings = JSON.parse(JSON.stringify(listingsStore));

function resetListings() {
  listingsStore.splice(0, listingsStore.length, ...JSON.parse(JSON.stringify(originalListings)));
}

test('getListings paginates records and reports metadata', () => {
  resetListings();

  const perPage = 2;
  const result = getListings({ page: 1, perPage });

  assert.ok(Array.isArray(result.records));
  assert.strictEqual(result.records.length, Math.min(perPage, originalListings.length));
  assert.strictEqual(result.total, originalListings.length);
  assert.strictEqual(result.page, 1);
  assert.strictEqual(
    result.totalPages,
    Math.max(1, Math.ceil(originalListings.length / perPage))
  );
  assert.strictEqual(result.startIndex, 0);
  assert.strictEqual(result.endIndex, Math.min(perPage, originalListings.length));
});

test('updateListings applies edits and forwards payload to the API client', async () => {
  resetListings();

  const target = listingsStore[0];
  const originalSubmit = apiClient.submitListingUpdates;
  let receivedPayload = null;
  apiClient.submitListingUpdates = async (payload) => {
    receivedPayload = payload;
    return { delivered: payload.length };
  };

  try {
    const applied = await updateListings([
      {
        id: target.id,
        businessName: 'Updated Business ',
        website: 'https://updated.example.com ',
        notes: '  Manual review complete  ',
        status: 'approved'
      }
    ]);

    assert.strictEqual(applied, 1);
    assert.strictEqual(target.businessName, 'Updated Business');
    assert.strictEqual(target.website, 'https://updated.example.com');
    assert.strictEqual(target.notes, 'Manual review complete');
    assert.strictEqual(target.status, 'approved');
    assert.ok(receivedPayload);
    assert.strictEqual(receivedPayload.length, 1);
    assert.strictEqual(receivedPayload[0].id, target.id);
    assert.strictEqual(receivedPayload[0].status, 'approved');
  } finally {
    apiClient.submitListingUpdates = originalSubmit;
    resetListings();
  }
});
