require('../polyfills/fetch');

const ADMIN_LISTINGS_ENDPOINT = '/v1/admin/listings';
const ADMIN_LISTINGS_REVIEW_ENDPOINT = '/v1/admin/listings/review';

class ApiClientError extends Error {
  constructor(message, { status = null, payload = null, code = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.payload = payload;
    this.code = code;
    if (cause) {
      this.cause = cause;
    }
  }
}

async function submitListingUpdates(updates = []) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { delivered: 0 };
  }

  try {
    const result = await callApi(ADMIN_LISTINGS_REVIEW_ENDPOINT, {
      method: 'POST',
      body: { listings: updates }
    });
    return result ?? { delivered: updates.length };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return {
        delivered: 0,
        skipped: updates.length,
        reason: error.message
      };
    }
    throw error;
  }
}

async function fetchDirectories() {
  const data = await callApi('/v1/admin/directories');
  return Array.isArray(data) ? data : [];
}

async function fetchDirectory(directoryId) {
  if (!directoryId) {
    throw new ApiClientError('directoryId is required', { code: 'VALIDATION_ERROR' });
  }
  return callApi(`/v1/admin/directories/${directoryId}`);
}

async function createDirectory(payload) {
  return callApi('/v1/admin/directories', {
    method: 'POST',
    body: payload
  });
}

async function updateDirectory(directoryId, payload) {
  if (!directoryId) {
    throw new ApiClientError('directoryId is required', { code: 'VALIDATION_ERROR' });
  }
  return callApi(`/v1/admin/directories/${directoryId}`, {
    method: 'PUT',
    body: payload
  });
}

async function deleteDirectory(directoryId) {
  if (!directoryId) {
    throw new ApiClientError('directoryId is required', { code: 'VALIDATION_ERROR' });
  }
  await callApi(`/v1/admin/directories/${directoryId}`, { method: 'DELETE' });
}

async function fetchCategories() {
  const data = await callApi('/v1/admin/categories');
  return Array.isArray(data) ? data : [];
}

async function fetchListings() {
  const data = await callApi(ADMIN_LISTINGS_ENDPOINT);
  return Array.isArray(data) ? data : [];
}

async function callApi(path, { method = 'GET', body } = {}) {
  const { baseUrl, token } = resolveConfig();
  ensureFetchAvailable();
  const url = new URL(path, baseUrl);
  const headers = {
    Authorization: `Bearer ${token}`
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const init = {
    method,
    headers
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url.toString(), init);
  } catch (error) {
    throw new ApiClientError('Failed to reach admin API', { cause: error, code: 'NETWORK_ERROR' });
  }

  if (response.status === 204) {
    return null;
  }

  const payload = await safeParseJson(response);
  if (!response.ok) {
    throw new ApiClientError('Admin API request failed', {
      status: response.status,
      payload
    });
  }

  return payload?.data ?? payload ?? null;
}

function resolveConfig() {
  const baseUrl = process.env.ADMIN_API_BASE_URL || process.env.API_BASE_URL || null;
  const token = process.env.ADMIN_API_TOKEN || null;
  if (!baseUrl || !token) {
    throw new ApiClientError('Admin API base URL or token is not configured', {
      code: 'CONFIG_ERROR'
    });
  }
  return { baseUrl, token };
}

function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new ApiClientError('Fetch API is not available in this version of Node.js', {
      code: 'FETCH_UNAVAILABLE'
    });
  }
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch (_err) {
    return null;
  }
}

module.exports = {
  ApiClientError,
  submitListingUpdates,
  fetchDirectories,
  fetchDirectory,
  createDirectory,
  updateDirectory,
  deleteDirectory,
  fetchCategories,
  fetchListings,
  resolveConfig
};
