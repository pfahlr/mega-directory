const test = require('node:test');
const assert = require('node:assert/strict');

const POLYFILL_PATH = '../dist/polyfills/fetch';

function clearRequireCache() {
  try {
    const resolved = require.resolve(POLYFILL_PATH);
    delete require.cache[resolved];
  } catch (_err) {
    // Module wasn't cached yet.
  }
}

test('API fetch polyfill installs a fetch implementation when missing', { concurrency: false }, () => {
  const originalFetch = global.fetch;
  clearRequireCache();
  global.fetch = undefined;

  const polyfill = require(POLYFILL_PATH);

  assert.strictEqual(typeof global.fetch, 'function');
  assert.strictEqual(typeof polyfill.installFetchPolyfill, 'function');

  clearRequireCache();
  global.fetch = originalFetch;
});
