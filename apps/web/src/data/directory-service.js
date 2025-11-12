import { directoryCatalog } from './directory-catalog.js';
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

export async function fetchDirectoryCatalog() {
  if (!API_BASE_URL) {
    return directoryCatalog;
  }

  try {
    const payload = await fetchJson(`${API_BASE_URL.replace(/\/$/, '')}/v1/directories`);
    if (Array.isArray(payload) && payload.length > 0) {
      return payload;
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
    if (payload) {
      return payload;
    }
  } catch {
    // Fallback below
  }

  return findDirectoryBySlug(directoryCatalog, slug);
}
