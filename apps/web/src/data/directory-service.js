import directoryCatalog from '@mega-directory/directory-data';
import { findDirectoryBySlug } from '../lib/directory-helpers.js';

const API_BASE_URL =
  typeof import.meta?.env?.PUBLIC_API_BASE_URL === 'string'
    ? import.meta.env.PUBLIC_API_BASE_URL
    : typeof process !== 'undefined'
      ? process.env.PUBLIC_API_BASE_URL
      : undefined;

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed request ${response.status}`);
  }
  return response.json();
}

export { directoryCatalog };

function extractData(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return null;
}

export async function fetchDirectoryCatalog() {
  if (!API_BASE_URL) {
    return directoryCatalog;
  }

  try {
    const payload = await fetchJson(
      `${API_BASE_URL.replace(/\/$/, '')}/v1/directories?limit=200`
    );
    const directories = extractData(payload);
    if (Array.isArray(directories) && directories.length > 0) {
      return directories;
    }
  } catch {
    // Swallow errors and fall back to static data.
  }

  return directoryCatalog;
}

export async function fetchDirectoryBySlug(slug) {
  if (!slug) {
    return null;
  }

  if (!API_BASE_URL) {
    return findDirectoryBySlug(directoryCatalog, slug);
  }

  try {
    const payload = await fetchJson(
      `${API_BASE_URL.replace(/\/$/, '')}/v1/directories/${encodeURIComponent(slug)}`,
    );
    const directory = payload?.data ?? payload;
    if (directory) {
      return directory;
    }
  } catch {
    // Fallback below
  }

  return findDirectoryBySlug(directoryCatalog, slug);
}
