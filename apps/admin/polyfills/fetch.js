const { fetch: undiciFetch, Headers, Request, Response } = require('undici');

function installFetchPolyfill(target = globalThis) {
  if (typeof target.fetch !== 'function') {
    target.fetch = undiciFetch;
  }
  if (typeof target.Headers !== 'function') {
    target.Headers = Headers;
  }
  if (typeof target.Request !== 'function') {
    target.Request = Request;
  }
  if (typeof target.Response !== 'function') {
    target.Response = Response;
  }

  return target.fetch;
}

installFetchPolyfill();

module.exports = {
  installFetchPolyfill
};
