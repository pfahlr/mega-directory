import { defineMiddleware } from 'astro:middleware';
import { fetchDirectoryCatalog } from './data/directory-service.js';
import { directoryRoutingSettings } from './lib/directory-helpers.js';
import {
  buildDirectoryResponseTargets,
  matchSubdirectoryRequest,
  matchSubdomainRequest,
} from './lib/directory-routing.js';

const PRIMARY_MODE = directoryRoutingSettings.primaryMode ?? 'subdirectory';
const SUBDIRECTORY_BASE = directoryRoutingSettings.subdirectoryBase || '/directories';
const SUBDOMAIN_ROOT = directoryRoutingSettings.subdomainRoot || '';
const NORMALIZED_BASE =
  !SUBDIRECTORY_BASE || SUBDIRECTORY_BASE === '/' ? '/' : SUBDIRECTORY_BASE.replace(/\/+$/, '');
const BASE_LOWER = NORMALIZED_BASE.toLowerCase();
const SUBDOMAIN_SUFFIX = SUBDOMAIN_ROOT ? `.${SUBDOMAIN_ROOT.toLowerCase()}` : '';
const DIRECTORY_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedDirectories = [];
let cacheTimestamp = 0;

const looksLikeAssetPath = (pathname = '') => {
  const segment = pathname.split('/').pop() ?? '';
  return /\.[a-z0-9]{2,}($|\?)/i.test(segment);
};

const isSubdirectoryCandidate = (pathname = '') => {
  if (!pathname || NORMALIZED_BASE === '/') {
    return NORMALIZED_BASE === '/' ? pathname !== '/' : false;
  }
  const normalized = pathname.replace(/\/{2,}/g, '/');
  const lowered = normalized.toLowerCase();
  return lowered === BASE_LOWER || lowered.startsWith(`${BASE_LOWER}/`);
};

const isSubdomainCandidate = (hostname = '') => {
  if (!SUBDOMAIN_SUFFIX || !hostname) {
    return false;
  }
  const lowered = hostname.toLowerCase();
  return lowered !== SUBDOMAIN_ROOT.toLowerCase() && lowered.endsWith(SUBDOMAIN_SUFFIX);
};

const absoluteUrlForPath = (contextUrl, path) => {
  try {
    const base = `${contextUrl.protocol}//${contextUrl.host}`;
    const target = new URL(path, base);
    target.search = contextUrl.search;
    target.hash = '';
    return target;
  } catch {
    return null;
  }
};

const applySearch = (targetUrl, contextUrl) => {
  if (!targetUrl) {
    return null;
  }
  targetUrl.search = contextUrl.search;
  targetUrl.hash = '';
  return targetUrl;
};

const buildRedirectResponse = (context, target) => {
  const finalTarget = applySearch(target, context.url);
  if (!finalTarget) {
    return null;
  }
  return context.redirect(finalTarget.toString(), 308);
};

const getDirectories = async () => {
  const now = Date.now();
  if (now - cacheTimestamp < DIRECTORY_CACHE_TTL_MS && cachedDirectories.length > 0) {
    return cachedDirectories;
  }

  try {
    const result = await fetchDirectoryCatalog();
    if (Array.isArray(result)) {
      cachedDirectories = result;
      cacheTimestamp = now;
      return cachedDirectories;
    }
  } catch {
    // Fall through to return existing cache.
  }

  cacheTimestamp = now;
  return cachedDirectories;
};

const handleSubdomainRequest = (context, match) => {
  const targets = buildDirectoryResponseTargets(match.directory, match.subpath);
  if (!targets.path) {
    return null;
  }

  if (PRIMARY_MODE === 'subdomain') {
    const rewriteTarget = absoluteUrlForPath(context.url, targets.path);
    return rewriteTarget ? context.rewrite(rewriteTarget) : null;
  }

  if (targets.canonicalUrl) {
    const redirectUrl = new URL(targets.canonicalUrl, context.url);
    return buildRedirectResponse(context, redirectUrl);
  }

  const fallback = absoluteUrlForPath(context.url, targets.path);
  return fallback ? context.rewrite(fallback) : null;
};

const handleSubdirectoryRequest = (context, match) => {
  const targets = buildDirectoryResponseTargets(match.directory, match.subpath);
  if (!targets.path) {
    return null;
  }

  if (PRIMARY_MODE === 'subdomain' && targets.subdomainUrl) {
    const redirectUrl = new URL(targets.subdomainUrl, context.url);
    return buildRedirectResponse(context, redirectUrl);
  }

  const normalizedPath =
    context.url.pathname === '/' ? '/' : context.url.pathname.replace(/\/+$/, '');
  if (targets.path !== normalizedPath) {
    const normalizedUrl = new URL(context.url.toString());
    normalizedUrl.pathname = targets.path;
    return buildRedirectResponse(context, normalizedUrl);
  }

  return null;
};

export const onRequest = defineMiddleware(async (context, next) => {
  const { url } = context;
  if (!url || looksLikeAssetPath(url.pathname)) {
    return next();
  }

  const hostIsSubdomain = isSubdomainCandidate(url.hostname);
  const pathIsDirectory = isSubdirectoryCandidate(url.pathname);

  if (!hostIsSubdomain && !pathIsDirectory) {
    return next();
  }

  const directories = await getDirectories();
  if (!directories.length) {
    return next();
  }

  if (hostIsSubdomain) {
    const match = matchSubdomainRequest(directories, url.hostname, url.pathname);
    if (match) {
      const response = handleSubdomainRequest(context, match);
      if (response) {
        return response;
      }
    }
  }

  if (pathIsDirectory) {
    const match = matchSubdirectoryRequest(directories, url.pathname);
    if (match) {
      const response = handleSubdirectoryRequest(context, match);
      if (response) {
        return response;
      }
    }
  }

  return next();
});
