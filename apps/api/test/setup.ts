import { beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from './helpers/database';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  await setupTestDatabase();
  console.log('✅ Test environment ready');
}, 60000);

// Global test teardown
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  await teardownTestDatabase();
  console.log('✅ Test environment cleaned up');
}, 30000);
