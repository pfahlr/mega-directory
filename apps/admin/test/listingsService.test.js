const test = require('node:test');
const assert = require('node:assert');

const apiClient = require('../services/apiClient');
const { getListings, updateListings } = require('../services/listingsService');

const sampleListings = [
  {
    id: 1,
    title: 'Nova Electric Co.',
    status: 'PENDING',
    categoryIds: [1],
    addresses: [{ city: 'Brooklyn', region: 'NY' }],
    websiteUrl: 'https://novaelectric.example.com',
    summary: 'Emergency electricians for NYC',
    notes: 'Initial import',
    sourceName: 'Crawler Feed',
    createdAt: '2024-05-22T09:30:00Z',
    updatedAt: '2024-05-22T09:30:00Z'
  },
  {
    id: 2,
    title: 'Green Canopy Tree Care',
    status: 'PENDING',
    categoryIds: [2],
    addresses: [{ city: 'Portland', region: 'OR' }],
    websiteUrl: 'https://greencanopy.example.com',
    summary: 'Storm cleanup experts',
    notes: 'Awaiting license check',
    sourceName: 'Crawler Feed',
    createdAt: '2024-05-21T14:10:00Z',
    updatedAt: '2024-05-21T14:10:00Z'
  },
  {
    id: 3,
    title: 'Lakeside Plumbing & Heating',
    status: 'INACTIVE',
    categoryIds: [3],
    addresses: [{ city: 'Cleveland', region: 'OH' }],
    websiteUrl: 'https://lakesideplumbing.example.com',
    summary: 'Same-day water heater installs',
    notes: 'Needs warranty proof',
    sourceName: 'Manual Upload',
    createdAt: '2024-05-19T08:55:00Z',
    updatedAt: '2024-05-19T08:55:00Z'
  }
];

const sampleCategories = [
  { id: 1, name: 'Electricians' },
  { id: 2, name: 'Arborists' },
  { id: 3, name: 'Plumbers' }
];

test('getListings paginates records and reports metadata', async () => {
  const originalFetchListings = apiClient.fetchListings;
  const originalFetchCategories = apiClient.fetchCategories;
  apiClient.fetchListings = async () => sampleListings;
  apiClient.fetchCategories = async () => sampleCategories;

  try {
    const perPage = 2;
    const result = await getListings({ page: 1, perPage });

    assert.ok(Array.isArray(result.records));
    assert.strictEqual(result.records.length, Math.min(perPage, sampleListings.length));
    assert.strictEqual(result.total, sampleListings.length);
    assert.strictEqual(result.page, 1);
    assert.strictEqual(
      result.totalPages,
      Math.max(1, Math.ceil(sampleListings.length / perPage))
    );
    assert.strictEqual(result.startIndex, 0);
    assert.strictEqual(result.endIndex, Math.min(perPage, sampleListings.length));
    assert.strictEqual(result.records[0].businessName, sampleListings[0].title);
    assert.strictEqual(result.records[0].category, 'Electricians');
  } finally {
    apiClient.fetchListings = originalFetchListings;
    apiClient.fetchCategories = originalFetchCategories;
  }
});

test('updateListings trims payloads and sends API updates', async () => {
  const originalSubmit = apiClient.submitListingUpdates;
  let receivedPayload = null;
  apiClient.submitListingUpdates = async (payload) => {
    receivedPayload = payload;
    return { delivered: payload.length };
  };

  try {
    const summary = await updateListings([
      {
        id: 1,
        businessName: 'Updated Nova ',
        website: 'https://updated.example.com ',
        notes: '  Manual review complete  ',
        shouldPersist: true,
        isActive: true
      }
    ]);

    assert.deepStrictEqual(summary, { saved: 1, removed: 0 });
    assert.ok(receivedPayload);
    assert.strictEqual(receivedPayload.length, 1);
    assert.strictEqual(receivedPayload[0].id, 1);
    assert.strictEqual(receivedPayload[0].businessName, 'Updated Nova');
    assert.strictEqual(receivedPayload[0].website, 'https://updated.example.com');
    assert.strictEqual(receivedPayload[0].notes, 'Manual review complete');
    assert.strictEqual(receivedPayload[0].status, 'APPROVED');
  } finally {
    apiClient.submitListingUpdates = originalSubmit;
  }
});

test('updateListings marks records as rejected when discarded', async () => {
  const originalSubmit = apiClient.submitListingUpdates;
  let receivedPayload = null;
  apiClient.submitListingUpdates = async (payload) => {
    receivedPayload = payload;
    return { delivered: payload.length };
  };

  try {
    const summary = await updateListings([
      {
        id: 2,
        shouldPersist: false
      }
    ]);

    assert.deepStrictEqual(summary, { saved: 0, removed: 1 });
    assert.strictEqual(receivedPayload?.length, 1);
    assert.strictEqual(receivedPayload[0].id, 2);
    assert.strictEqual(receivedPayload[0].status, 'REJECTED');
  } finally {
    apiClient.submitListingUpdates = originalSubmit;
  }
});

test('updateListings respects active toggle and sends INACTIVE', async () => {
  const originalSubmit = apiClient.submitListingUpdates;
  let receivedPayload = null;
  apiClient.submitListingUpdates = async (payload) => {
    receivedPayload = payload;
    return { delivered: payload.length };
  };

  try {
    const summary = await updateListings([
      {
        id: 3,
        shouldPersist: true,
        isActive: false
      }
    ]);

    assert.deepStrictEqual(summary, { saved: 1, removed: 0 });
    assert.strictEqual(receivedPayload?.length, 1);
    assert.strictEqual(receivedPayload[0].status, 'INACTIVE');
  } finally {
    apiClient.submitListingUpdates = originalSubmit;
  }
});
