const ADMIN_LISTINGS_ENDPOINT = '/v1/admin/listings/review';

async function submitListingUpdates(updates = []) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { delivered: 0 };
  }

  const baseUrl = process.env.ADMIN_API_BASE_URL || process.env.API_BASE_URL || null;
  const token = process.env.ADMIN_API_TOKEN || null;

  if (!baseUrl || !token) {
    return {
      delivered: 0,
      skipped: updates.length,
      reason: 'Admin API base URL or token is not configured'
    };
  }

  if (typeof fetch !== 'function') {
    return {
      delivered: 0,
      skipped: updates.length,
      reason: 'Fetch API is not available in this version of Node.js'
    };
  }

  const url = new URL(ADMIN_LISTINGS_ENDPOINT, baseUrl);
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ listings: updates })
  });

  const payload = await safeParseJson(response);
  if (!response.ok) {
    const error = new Error('Failed to submit listing updates to API');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload ?? { delivered: updates.length };
}

async function safeParseJson(response) {
  try {
    return await response.json();
  } catch (_err) {
    return null;
  }
}

module.exports = {
  submitListingUpdates
};
