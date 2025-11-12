const test = require('node:test');
const assert = require('node:assert/strict');

const seoStore = require('../data/seoEntries');
const { updateSeoEntries } = require('../services/seoService');

const originalStore = deepClone(seoStore);

function resetStore() {
  seoStore.splice(0, seoStore.length, ...deepClone(originalStore));
}

test('updateSeoEntries skips unchanged payloads but updates real edits', () => {
  resetStore();

  const target = seoStore[0];
  const originalTitle = target.metaTitle;
  const originalDescription = target.metaDescription;
  const originalTimestamp = target.lastUpdated;

  const untouched = updateSeoEntries([
    {
      id: target.id,
      metaTitle: originalTitle,
      metaDescription: originalDescription,
    },
  ]);

  assert.strictEqual(untouched, 0);
  assert.strictEqual(target.metaTitle, originalTitle);
  assert.strictEqual(target.metaDescription, originalDescription);
  assert.strictEqual(target.lastUpdated, originalTimestamp);

  const nextTitle = `${originalTitle} | Summer Campaign`;
  const changed = updateSeoEntries([
    {
      id: target.id,
      metaTitle: nextTitle,
    },
  ]);

  assert.strictEqual(changed, 1);
  assert.strictEqual(target.metaTitle, nextTitle);
  assert.strictEqual(target.metaDescription, originalDescription);
  assert.notStrictEqual(target.lastUpdated, originalTimestamp);
  assert.ok(Number.isFinite(Date.parse(target.lastUpdated)));
});

test('updateSeoEntries trims payload values and supports partial updates', () => {
  resetStore();

  const target = seoStore[1];
  const trimmedDescription = 'New local description';
  const result = updateSeoEntries([
    {
      id: target.id,
      metaDescription: `  ${trimmedDescription}   `,
    },
  ]);

  assert.strictEqual(result, 1);
  assert.strictEqual(target.metaTitle, originalStore[1].metaTitle);
  assert.strictEqual(target.metaDescription, trimmedDescription);
});

test('updateSeoEntries ignores unknown ids and empty payloads', () => {
  resetStore();

  const snapshot = deepClone(seoStore);
  const result = updateSeoEntries([
    { id: 'missing_entry', metaTitle: 'No-op' },
    null,
    {},
  ]);

  assert.strictEqual(result, 0);
  assert.deepStrictEqual(seoStore, snapshot);
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
