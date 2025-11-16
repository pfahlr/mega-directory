import { fetch as undiciFetch, Headers, Request, Response } from 'undici';

type FetchLike = typeof undiciFetch;

interface FetchTarget {
  fetch?: FetchLike;
  Headers?: typeof Headers;
  Request?: typeof Request;
  Response?: typeof Response;
}

export function installFetchPolyfill(target: typeof globalThis = globalThis): FetchLike {
  const scope = target as unknown as FetchTarget;

  if (typeof scope.fetch !== 'function') {
    scope.fetch = undiciFetch as FetchLike;
  }
  if (typeof scope.Headers !== 'function') {
    scope.Headers = Headers;
  }
  if (typeof scope.Request !== 'function') {
    scope.Request = Request;
  }
  if (typeof scope.Response !== 'function') {
    scope.Response = Response;
  }

  return scope.fetch!;
}

installFetchPolyfill();

export default installFetchPolyfill;
