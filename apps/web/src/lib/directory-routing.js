import {
  buildDirectoryPagePath,
  buildDirectoryRouteConfig,
  directoryRoutingSettings,
  getDirectorySubdirectorySlug,
  normalizeSubdirectory,
  sanitizeHostname,
} from './directory-helpers.js';

const SUBDIRECTORY_BASE = directoryRoutingSettings.subdirectoryBase || '/directories';
const SUBDOMAIN_ROOT = directoryRoutingSettings.subdomainRoot || '';
const NORMALIZED_BASE =
  !SUBDIRECTORY_BASE || SUBDIRECTORY_BASE === '/' ? '/' : SUBDIRECTORY_BASE.replace(/\/+$/, '');
const BASE_WITH_LEADING = NORMALIZED_BASE.startsWith('/') ? NORMALIZED_BASE : `/${NORMALIZED_BASE}`;
const BASE_STRIPPED = BASE_WITH_LEADING === '/' ? '' : BASE_WITH_LEADING.replace(/^\//, '');

const SUBDOMAIN_SUFFIX = SUBDOMAIN_ROOT ? `.${SUBDOMAIN_ROOT}` : '';

const normalizePathname = (pathname = '/') => {
  if (!pathname) {
    return '/';
  }
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeading.replace(/\/{2,}/g, '/');
};

const trimTrailingSlashes = (value) => (value === '/' ? '/' : value.replace(/\/+$/, '') || '/');

const stripSubdirectoryBase = (pathname = '') => {
  const normalizedPath = normalizePathname(pathname);
  if (BASE_WITH_LEADING === '/') {
    return normalizedPath.replace(/^\/+/, '');
  }

  const comparablePath = trimTrailingSlashes(normalizedPath).toLowerCase();
  const comparableBase = BASE_WITH_LEADING.toLowerCase();

  if (comparablePath === comparableBase) {
    return '';
  }

  if (!comparablePath.startsWith(`${comparableBase}/`)) {
    return null;
  }

  return normalizedPath.slice(BASE_WITH_LEADING.length).replace(/^\/+/, '');
};

const appendSubpath = (base, subpath) => {
  if (!base) {
    return base ?? null;
  }
  if (!subpath) {
    return base;
  }
  const trimmed = base.endsWith('/') ? base.replace(/\/+$/, '') : base;
  return `${trimmed}/${subpath}`;
};

const normalizeSubpath = (subpath = '') => {
  if (!subpath) {
    return '';
  }
  return normalizeSubdirectory(subpath, '');
};

const sanitizeRequestHost = (hostname = '') => sanitizeHostname(hostname);

export function matchSubdirectoryRequest(directories = [], pathname = '/') {
  if (!Array.isArray(directories) || directories.length === 0) {
    return null;
  }

  const rawRemainder = stripSubdirectoryBase(pathname);
  if (rawRemainder === null) {
    return null;
  }

  const normalizedPath = normalizeSubdirectory(rawRemainder, '');
  if (!normalizedPath) {
    return null;
  }

  let candidate = null;
  for (const directory of directories) {
    const slug = getDirectorySubdirectorySlug(directory);
    if (!slug) {
      continue;
    }

    if (normalizedPath === slug) {
      return {
        directory,
        slug,
        subpath: '',
        subcategorySlug: '',
      };
    }

    if (normalizedPath.startsWith(`${slug}/`)) {
      const rest = normalizedPath.slice(slug.length + 1);
      if (!candidate || slug.length > candidate.slug.length) {
        candidate = { directory, slug, subpath: rest };
      }
    }
  }

  if (!candidate) {
    return null;
  }

  const subcategorySlug = candidate.subpath.split('/')[0] ?? '';
  return {
    directory: candidate.directory,
    slug: candidate.slug,
    subpath: candidate.subpath,
    subcategorySlug,
  };
}

export function matchSubdomainRequest(directories = [], hostname = '', pathname = '/') {
  if (!SUBDOMAIN_SUFFIX || !Array.isArray(directories) || directories.length === 0) {
    return null;
  }

  const normalizedHost = sanitizeRequestHost(hostname);
  if (
    !normalizedHost ||
    normalizedHost === SUBDOMAIN_ROOT ||
    !normalizedHost.endsWith(SUBDOMAIN_SUFFIX)
  ) {
    return null;
  }

  const directory = directories.find((entry) => {
    const routes = buildDirectoryRouteConfig(entry);
    return routes.subdomainHost === normalizedHost;
  });

  if (!directory) {
    return null;
  }

  let normalizedPath = normalizeSubdirectory(pathname, '');
  if (BASE_STRIPPED && normalizedPath.startsWith(`${BASE_STRIPPED}/`)) {
    normalizedPath = normalizedPath.slice(BASE_STRIPPED.length + 1);
  } else if (normalizedPath === BASE_STRIPPED) {
    normalizedPath = '';
  }

  const subcategorySlug = normalizedPath ? normalizedPath.split('/')[0] : '';
  return {
    directory,
    subpath: normalizedPath,
    subcategorySlug,
    host: normalizedHost,
  };
}

export function buildDirectoryResponseTargets(directory, subpath = '') {
  if (!directory) {
    return {
      path: null,
      canonicalUrl: null,
      subdomainUrl: null,
      subpath: '',
    };
  }

  const normalizedSubpath = normalizeSubpath(subpath);
  const basePath = buildDirectoryPagePath(directory);
  const routeConfig = buildDirectoryRouteConfig(directory);

  return {
    path: appendSubpath(basePath, normalizedSubpath),
    canonicalUrl: appendSubpath(routeConfig.canonicalUrl, normalizedSubpath),
    subdomainUrl: appendSubpath(routeConfig.subdomainUrl, normalizedSubpath),
    subpath: normalizedSubpath,
  };
}
