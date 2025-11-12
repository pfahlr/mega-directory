const test = require('node:test');
const assert = require('node:assert');

const approvedStore = require('../data/categoryLocations');
const pendingStore = require('../data/categoryLocationDiscoveries');
const {
  getPendingCategoryLocations,
  getApprovedCategoryLocations,
  approveCategoryLocations
} = require('../services/categoryLocationService');

const originalApproved = deepClone(approvedStore);
const originalPending = deepClone(pendingStore);

function resetStores() {
  approvedStore.splice(0, approvedStore.length, ...deepClone(originalApproved));
  pendingStore.splice(0, pendingStore.length, ...deepClone(originalPending));
}

test('getPendingCategoryLocations mirrors the pending store', () => {
  resetStores();

  const pending = getPendingCategoryLocations();
  assert.strictEqual(pending.length, pendingStore.length);
  assert.notStrictEqual(pending, pendingStore, 'service should not expose a clone');
});

test('getApprovedCategoryLocations mirrors the approved store', () => {
  resetStores();

  const approved = getApprovedCategoryLocations();
  assert.strictEqual(approved.length, approvedStore.length);
  assert.notStrictEqual(approved, approvedStore);
});

test('approveCategoryLocations moves pending entry into approved store', () => {
  resetStores();

  const target = pendingStore[0];
  const result = approveCategoryLocations([{ id: target.id, approve: true }]);

  assert.strictEqual(result.added, 1);
  assert.ok(!pendingStore.some((entry) => entry.id === target.id));
  assert.ok(approvedStore.some((entry) => entry.id === target.id));
});

test('approveCategoryLocations skips duplicates by slug and leaves pending intact', () => {
  resetStores();

  const duplicateSlug = approvedStore[0].slug;
  pendingStore.push({
    id: 'disc_duplicate_slug',
    category: 'Test Category',
    location: 'Test City, TC',
    slug: duplicateSlug,
    discoveredAt: new Date().toISOString(),
    source: 'test-suite',
    listingsCount: 5,
    sampleListings: []
  });

  const result = approveCategoryLocations([{ id: 'disc_duplicate_slug', approve: true }]);

  assert.strictEqual(result.added, 0);
  assert.ok(pendingStore.some((entry) => entry.id === 'disc_duplicate_slug'));
  assert.strictEqual(
    approvedStore.filter((entry) => entry.slug === duplicateSlug).length,
    1
  );
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
