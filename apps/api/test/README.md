# Test Suite

Comprehensive test suite for the Mega Directory API.

## Overview

The test suite includes:
- **Unit tests** (`test/unit/`) - Test individual functions and modules in isolation
- **Integration tests** (`test/integration/`) - Test API endpoints and database operations
- **E2E tests** (`test/e2e/`) - Test complete workflows end-to-end

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- `DATABASE_URL` environment variable set

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Ensure your database is running and migrations are applied:
   ```bash
   npx prisma migrate dev
   ```

3. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/mega_directory_test"
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests (fast)
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Structure

```
test/
├── helpers/          # Test utilities and helpers
│   ├── database.ts   # Database setup/teardown
│   ├── factories.ts  # Test data factories
│   └── api.ts        # API request helpers
├── unit/             # Unit tests
│   └── db.test.ts    # Database helper tests
├── integration/      # Integration tests
│   ├── listings.test.ts
│   └── public-api.test.ts
└── e2e/              # End-to-end tests
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions in isolation:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/myModule';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Integration Tests

Integration tests test database operations and can use the test factories:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { clearTestData } from '../helpers/database';
import { createTestListing } from '../helpers/factories';

describe('Listings', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  it('should create listing', async () => {
    const listing = await createTestListing({
      title: 'Test Business'
    });
    expect(listing.id).toBeDefined();
  });
});
```

### Test Factories

Use test factories to create test data easily:

```typescript
import { createTestListing, createApprovedListing, createTestDirectory } from '../helpers/factories';

// Create a listing with default values
const listing = await createTestListing();

// Create an approved listing
const approved = await createApprovedListing({
  title: 'My Business'
});

// Create a directory
const directory = await createTestDirectory();
```

## Coverage Thresholds

The test suite enforces minimum coverage thresholds:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## CI/CD Integration

Tests run automatically in CI/CD pipelines. Ensure all tests pass before merging:

```bash
npm run test:coverage
```

## Troubleshooting

### Database Connection Issues

If tests fail with database connection errors:
1. Verify `DATABASE_URL` is set correctly
2. Ensure PostgreSQL is running
3. Check database permissions
4. Run migrations: `npx prisma migrate dev`

### Test Timeouts

If tests timeout:
1. Increase timeout in `vitest.config.ts`
2. Check for hanging database connections
3. Ensure test cleanup is working properly

### Port Conflicts

If you see port conflicts:
1. Stop any running API servers
2. Check for other processes using the same ports
3. Update port configuration if needed

## Best Practices

1. **Keep tests fast** - Unit tests should run in milliseconds
2. **Clean up** - Always clean test data in `beforeEach` or `afterEach`
3. **Be specific** - Test one thing at a time
4. **Use factories** - Don't create test data manually
5. **Assert thoroughly** - Check all important properties
6. **Handle errors** - Test both success and failure cases
7. **Mock external services** - Don't make real API calls to external services

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Supertest Documentation](https://github.com/ladjs/supertest)
