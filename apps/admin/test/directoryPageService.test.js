const test = require('node:test');
const assert = require('node:assert/strict');

const directoryStore = require('../data/directoryPages');
const directoryOptions = require('../data/directoryPageOptions');
const {
  createDirectoryPage,
  updateDirectoryPages
} = require('../services/directoryPageService');

const originalStore = deepClone(directoryStore);

function resetStore() {
  directoryStore.splice(0, directoryStore.length, ...deepClone(originalStore));
}

test('createDirectoryPage enforces required fields and uniqueness', () => {
  resetStore();

  const initialLength = directoryStore.length;
  const invalid = createDirectoryPage({
    title: '',
    categoryId: '',
    locationId: '',
    subdomain: '  ',
    subdirectory: '',
    locationAgnostic: false,
    metaTitle: '',
    metaDescription: ''
  });

  assert.ok(invalid.errors);
  assert.deepStrictEqual(
    Object.keys(invalid.errors).sort(),
    ['categoryId', 'locationId', 'metaDescription', 'metaTitle', 'subdirectory', 'subdomain', 'title']
  );
  assert.strictEqual(directoryStore.length, initialLength);

  const existing = directoryStore[0];
  assert.ok(existing, 'expected seed directory pages for tests');

  const duplicate = createDirectoryPage({
    title: 'Duplicate Attempt',
    categoryId: existing.categoryId,
    locationId: existing.locationId,
    subdomain: existing.subdomain,
    subdirectory: existing.subdirectory,
    locationAgnostic: Boolean(existing.locationAgnostic),
    metaTitle: 'Example',
    metaDescription: 'Example description'
  });

  assert.ok(duplicate.errors.subdomain);
  assert.ok(duplicate.errors.subdirectory);
  assert.strictEqual(directoryStore.length, initialLength);
});

test('createDirectoryPage accepts location-agnostic directories and normalizes fields', () => {
  resetStore();

  const category = directoryOptions.categories?.[0];
  assert.ok(category, 'expected at least one category option');

  const result = createDirectoryPage({
    title: '  Remote Support Specialists  ',
    categoryId: category.id,
    locationAgnostic: true,
    locationId: '',
    subdomain: '  remote-support ',
    subdirectory: '  remote/support  ',
    metaTitle: '  Remote Support Pros  ',
    metaDescription: '  Nationwide remote troubleshooting help.  ',
    metaKeywords: '  support, remote, it  ',
    ogImageUrl: 'https://cdn.example.com/images/remote.png',
    heroTitle: '  Remote Experts  ',
    heroSubtitle: '  Help desk on demand  ',
    introMarkdown: '  **Get help** anytime.  '
  });

  assert.ifError(result.errors);
  assert.ok(result.record?.id);
  assert.strictEqual(result.record.title, 'Remote Support Specialists');
  assert.strictEqual(result.record.locationId, null);
  assert.strictEqual(result.record.locationAgnostic, true);
  assert.strictEqual(result.record.subdomain, 'remote-support');
  assert.strictEqual(result.record.subdirectory, 'remote/support');
  assert.strictEqual(result.record.metaTitle, 'Remote Support Pros');
  assert.strictEqual(result.record.metaDescription, 'Nationwide remote troubleshooting help.');
  assert.strictEqual(result.record.metaKeywords, 'support, remote, it');
  assert.strictEqual(directoryStore.at(-1).id, result.record.id);
});

test('updateDirectoryPages applies edits and handles save/deactivate toggles', () => {
  resetStore();

  const target = directoryStore[0];
  assert.ok(target, 'expected at least one seed directory page');

  const updatedTitle = `${target.title} (Refreshed)`;
  const updateResult = updateDirectoryPages([
    {
      id: target.id,
      title: updatedTitle,
      heroTitle: 'Updated Hero',
      heroSubtitle: 'Updated Subtitle',
      introMarkdown: 'Updated intro',
      metaTitle: 'Updated Meta Title',
      metaDescription: '  Trim this description   ',
      metaKeywords: 'alpha, beta, gamma',
      ogImageUrl: 'https://cdn.example.com/og/new.png',
      save: true
    }
  ]);

  assert.strictEqual(updateResult.updated, 1);
  assert.ok(!updateResult.errors || Object.keys(updateResult.errors).length === 0);
  assert.strictEqual(target.title, updatedTitle);
  assert.strictEqual(target.heroTitle, 'Updated Hero');
  assert.strictEqual(target.heroSubtitle, 'Updated Subtitle');
  assert.strictEqual(target.introMarkdown, 'Updated intro');
  assert.strictEqual(target.metaDescription, 'Trim this description');
  assert.strictEqual(target.status, 'ACTIVE');
  assert.strictEqual(target.isActive, true);

  const deactivateResult = updateDirectoryPages([
    {
      id: target.id,
      deactivate: true
    }
  ]);

  assert.strictEqual(deactivateResult.updated, 1);
  assert.strictEqual(target.status, 'ARCHIVED');
  assert.strictEqual(target.isActive, false);
});

test('updateDirectoryPages rejects conflicts and invalid location assignments', () => {
  resetStore();

  assert.ok(directoryStore.length >= 2, 'expected multiple directory pages for conflict tests');
  const first = directoryStore[0];
  const second = directoryStore[1];

  const conflict = updateDirectoryPages([
    {
      id: second.id,
      subdomain: first.subdomain
    }
  ]);

  assert.strictEqual(conflict.updated, 0);
  assert.ok(conflict.errors?.[second.id]?.subdomain);

  const invalidLocation = updateDirectoryPages([
    {
      id: second.id,
      locationAgnostic: false,
      locationId: ''
    }
  ]);

  assert.strictEqual(invalidLocation.updated, 0);
  assert.ok(invalidLocation.errors?.[second.id]?.locationId);
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}
