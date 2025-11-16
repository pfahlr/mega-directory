const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const MIGRATION_FILE = path.resolve(
  __dirname,
  '..',
  'db',
  'migrations',
  '003_listings_table_enhancements',
  'migration.sql'
);
const PRISMA_SCHEMA = path.resolve(__dirname, '..', 'db', 'schema.prisma');

function loadMigration() {
  return fs.readFileSync(MIGRATION_FILE, 'utf8');
}

function loadPrismaSchema() {
  return fs.readFileSync(PRISMA_SCHEMA, 'utf8');
}

function extractTableBlock(sql, tableName) {
  const tableRegex = new RegExp(
    `CREATE TABLE\\s+"${tableName}"\\s*\\(([\\s\\S]*?)\\);`,
    'i'
  );
  const match = sql.match(tableRegex);
  assert.ok(match, `Expected to find CREATE TABLE for ${tableName}`);
  return match[1];
}

function expectColumn(block, columnName, typePattern) {
  const columnRegex = new RegExp(`"${columnName}"\\s+${typePattern}`, 'i');
  assert.match(
    block,
    columnRegex,
    `Expected column "${columnName}" definition to match /${typePattern}/i`
  );
}

function extractPrismaModel(schema, modelName) {
  const regex = new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = schema.match(regex);
  assert.ok(match, `Expected to find Prisma model for ${modelName}`);
  return match[1];
}

test('migration adds listings_categories bridge table with FKs', () => {
  const sql = loadMigration();
  const block = extractTableBlock(sql, 'ListingCategory');

  expectColumn(block, 'listingId', 'INTEGER\\s+NOT\\s+NULL');
  expectColumn(block, 'categoryId', 'INTEGER\\s+NOT\\s+NULL');
  expectColumn(block, 'isPrimary', 'BOOLEAN\\s+NOT\\s+NULL\\s+DEFAULT\\s+FALSE');
  expectColumn(block, 'assignedAt', 'TIMESTAMPTZ\\s+NOT\\s+NULL\\s+DEFAULT\\s+NOW\\(\\)');

  assert.match(
    block,
    /PRIMARY KEY\s*\("listingId",\s*"categoryId"\)/i,
    'Expected composite primary key on listingId/categoryId'
  );

  assert.match(
    sql,
    /CONSTRAINT\s+"ListingCategory_listingId_fkey"\s+FOREIGN KEY\s*\("listingId"\)\s+REFERENCES\s+"Listing"\("id"\)/i,
    'Expected FK from listing_categories.listingId to Listing.id'
  );

  assert.match(
    sql,
    /CONSTRAINT\s+"ListingCategory_categoryId_fkey"\s+FOREIGN KEY\s*\("categoryId"\)\s+REFERENCES\s+"Category"\("id"\)/i,
    'Expected FK from listing_categories.categoryId to Category.id'
  );
});

test('migration adds listing_addresses table with geo references', () => {
  const sql = loadMigration();
  const block = extractTableBlock(sql, 'ListingAddress');

  expectColumn(block, 'id', 'SERIAL\\s+PRIMARY\\s+KEY');
  expectColumn(block, 'listingId', 'INTEGER\\s+NOT\\s+NULL');
  expectColumn(block, 'label', 'TEXT');
  expectColumn(block, 'addressLine1', 'TEXT');
  expectColumn(block, 'addressLine2', 'TEXT');
  expectColumn(block, 'city', 'TEXT');
  expectColumn(block, 'region', 'TEXT');
  expectColumn(block, 'postalCode', 'TEXT');
  expectColumn(block, 'country', 'TEXT\\s+DEFAULT\\s+\'US\'');
  expectColumn(block, 'latitude', 'DOUBLE\\s+PRECISION');
  expectColumn(block, 'longitude', 'DOUBLE\\s+PRECISION');
  expectColumn(block, 'isPrimary', 'BOOLEAN\\s+NOT\\s+NULL\\s+DEFAULT\\s+FALSE');
  expectColumn(block, 'countryId', 'INTEGER');
  expectColumn(block, 'stateId', 'INTEGER');
  expectColumn(block, 'cityId', 'INTEGER');
  expectColumn(block, 'postalCodeId', 'INTEGER');
  expectColumn(block, 'createdAt', 'TIMESTAMPTZ\\s+NOT\\s+NULL\\s+DEFAULT\\s+NOW\\(\\)');
  expectColumn(block, 'updatedAt', 'TIMESTAMPTZ\\s+NOT\\s+NULL\\s+DEFAULT\\s+NOW\\(\\)');

  assert.match(
    sql,
    /CONSTRAINT\s+"ListingAddress_listingId_fkey"\s+FOREIGN KEY\s*\("listingId"\)\s+REFERENCES\s+"Listing"\("id"\)\s+ON DELETE CASCADE/i,
    'Expected FK from listing_addresses.listingId to Listing.id'
  );
  assert.match(
    sql,
    /FOREIGN KEY\s*\("cityId"\)\s+REFERENCES\s+"City"\("id"\)\s+ON DELETE SET NULL/i,
    'Expected FK from listing_addresses.cityId to City.id'
  );
  assert.match(
    sql,
    /FOREIGN KEY\s*\("postalCodeId"\)\s+REFERENCES\s+"PostalCode"\("id"\)\s+ON DELETE SET NULL/i,
    'Expected FK from listing_addresses.postalCodeId to PostalCode.id'
  );
});

test('Prisma schema exposes ListingAddress + ListingCategory relations', () => {
  const schema = loadPrismaSchema();
  const listingBlock = extractPrismaModel(schema, 'Listing');
  assert.match(
    listingBlock,
    /addresses\s+ListingAddress\[\]/,
    'Listing model should expose addresses relation'
  );
  assert.match(
    listingBlock,
    /categories\s+ListingCategory\[\]/,
    'Listing model should expose categories relation'
  );

  const addressBlock = extractPrismaModel(schema, 'ListingAddress');
  assert.match(addressBlock, /listingId\s+Int/, 'ListingAddress needs listingId field');
  assert.match(addressBlock, /listing\s+Listing\s+@relation/, 'ListingAddress should relate to Listing');

  const categoryBlock = extractPrismaModel(schema, 'ListingCategory');
  assert.match(categoryBlock, /listing\s+Listing\s+@relation/, 'ListingCategory should relate to Listing');
  assert.match(categoryBlock, /category\s+Category\s+@relation/, 'ListingCategory should relate to Category');
});
