const test = require('node:test');
const assert = require('node:assert/strict');

const POLYFILL_PATH = '../polyfills/fetch';

function clearRequireCache() {
  try {
    const resolved = require.resolve(POLYFILL_PATH);
    delete require.cache[resolved];
  } catch (_error) {
    // Module has not been loaded yet.
  }
}

test('admin fetch polyfill installs fetch when missing', { concurrency: false }, () => {
  const originalFetch = global.fetch;
  clearRequireCache();
  global.fetch = undefined;

  const polyfill = require(POLYFILL_PATH);

  assert.strictEqual(typeof global.fetch, 'function');
  assert.strictEqual(typeof polyfill.installFetchPolyfill, 'function');

  clearRequireCache();
  global.fetch = originalFetch;
});
