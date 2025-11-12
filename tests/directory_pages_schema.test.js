const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function loadCoreSchema() {
  const schemaPath = path.resolve(__dirname, '..', 'db', 'migrations', '001_core_schema.sql');
  return fs.readFileSync(schemaPath, 'utf8');
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

test('directory_pages table exposes required metadata columns in snake_case', () => {
  const schema = loadCoreSchema();
  const tableBlock = extractTableBlock(schema, 'directory_pages');
  const requiredColumns = [
    { name: 'title', pattern: 'TEXT\\s+NOT\\s+NULL' },
    { name: 'subdomain', pattern: 'TEXT\\s+NOT\\s+NULL' },
    { name: 'subdirectory', pattern: 'TEXT\\s+NOT\\s+NULL' },
    { name: 'meta_keywords', pattern: 'TEXT' },
    { name: 'meta_description', pattern: 'TEXT' },
    { name: 'og_image_url', pattern: 'TEXT' },
    { name: 'location_agnostic', pattern: 'BOOLEAN\\s+NOT\\s+NULL' }
  ];

  for (const column of requiredColumns) {
    expectColumn(tableBlock, column.name, column.pattern);
  }
});
