# Testing Guide: Database Integration & Seed Data

**Date:** 2025-11-17
**Tasks:** 11-14 from Database Persistence Migration Plan
**Status:** Documented (Requires Running Services)

---

## Overview

Tasks 11-14 are operational testing tasks that verify the database integration works correctly. These tasks require:
1. PostgreSQL database running
2. API server running
3. Manual/automated testing via HTTP requests

## Prerequisites

Before running these tests, ensure:

```bash
# 1. Database is running
docker compose up -d db

# 2. Verify database is accessible
docker compose ps
# Should show: db service "Up"

# 3. Database URL is set
export DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory"

# 4. Dependencies installed
npm install

# 5. Prisma client generated
npx prisma generate --schema=./db/schema.prisma
```

---

## Task 11: Test API Server Database Integration

### Goal
Verify API server connects to database and performs CRUD operations correctly.

### Steps

#### 1. Start API Server

```bash
cd apps/api
npm run dev
```

**Expected Output:**
```
[db] Database connection successful
API server listening on http://localhost:3030
```

**What to Verify:**
- No database connection errors
- Server starts on correct port
- Prisma client initializes successfully

#### 2. Test Health Endpoint

```bash
curl http://localhost:3030/health
```

**Expected:** `{"status":"ok","uptime":...,"timestamp":"..."}`

#### 3. Test Empty Database

```bash
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings
```

**Expected:** `{"data":[]}`
**Verifies:** Database query returns empty array (not in-memory data)

#### 4. Create Test Listing

```bash
curl -X POST \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Listing - API Integration",
       "slug": "test-listing-api-integration",
       "websiteUrl": "https://example.com",
       "summary": "Test listing for verifying database persistence",
       "addresses": [
         {
           "addressLine1": "123 Test St",
           "city": "Test City",
           "region": "TC",
           "postalCode": "12345",
           "country": "US"
         }
       ],
       "status": "PENDING"
     }' \
     http://localhost:3030/v1/admin/listings
```

**Expected:** HTTP 201 with created listing JSON
**Verifies:** CREATE operation works

#### 5. Verify Persistence in Database

```bash
psql "$DATABASE_URL" \
  -c "SELECT id, title, slug, status FROM \"Listing\" WHERE slug = 'test-listing-api-integration';"
```

**Expected:** Row showing the test listing
**Verifies:** Data actually persisted to database

#### 6. Test Data Persistence Across Restart

```bash
# Stop API server (Ctrl+C)
# Wait 5 seconds
# Restart API server
cd apps/api && npm run dev
```

Then verify listing still exists:

```bash
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings
```

**Expected:** Array containing the test listing
**Verifies:** Data survives server restart (not in-memory!)

#### 7. Test Update Operation

```bash
curl -X PUT \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Updated Test Listing",
       "status": "APPROVED"
     }' \
     http://localhost:3030/v1/admin/listings/1
```

**Expected:** HTTP 200 with updated listing
**Verifies:** UPDATE operation works

#### 8. Verify Update Persisted

```bash
psql "$DATABASE_URL" \
  -c "SELECT title, status FROM \"Listing\" WHERE id = 1;"
```

**Expected:** Shows "Updated Test Listing" with status "APPROVED"

#### 9. Test Delete Operation

```bash
curl -X DELETE \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings/1
```

**Expected:** HTTP 204 (no content)
**Verifies:** DELETE operation works

#### 10. Verify Deletion Persisted

```bash
psql "$DATABASE_URL" \
  -c "SELECT COUNT(*) FROM \"Listing\" WHERE id = 1;"
```

**Expected:** Count = 0

### Success Criteria

All 10 steps should complete successfully, demonstrating:
- ✅ Database connection works
- ✅ CREATE operations persist
- ✅ READ operations query database
- ✅ UPDATE operations persist
- ✅ DELETE operations persist
- ✅ Data survives server restarts
- ✅ No in-memory data returned

### Create Git Tag (On Success)

```bash
git tag -a v0.1.0-prisma-integration -m "API server now uses Prisma for database persistence"
git push origin v0.1.0-prisma-integration
```

---

## Task 12: Seed Database with Test Data

### Goal
Populate database with realistic test data for development/testing.

### Seed Script Analysis

The existing `db/seed.ts` creates:

**Geography Data:**
- United States (ID: 233)
- States: New York (ID: 3930), California (ID: 3876), Colorado (ID: 3844)
- Cities: NYC, San Francisco, Denver
- Postal codes for each city

**Users:**
- Admin user (admin@example.com)

**Categories:**
- Professional Services
- Jobs

**Locations:**
- New York City
- San Francisco
- Denver

**Directories:**
- NYC Professional Services
- SF Jobs
- Denver Tech (if present)

**Listings:**
- Multiple listings across directories
- Mix of PENDING, APPROVED, REJECTED statuses
- Addresses for each listing
- Category associations

**Featured Slots:**
- HERO and PREMIUM slots for directories
- Linked to specific listings

**LLM Config:**
- Field configurations for AI-generated content

### Steps

#### 1. Generate Prisma Client

```bash
npx prisma generate --schema=./db/schema.prisma
```

#### 2. Run Seed Script

```bash
cd db
npx tsx seed.ts
```

**Expected Output:**
The script uses `upsert` operations, so it's idempotent (safe to run multiple times).

#### 3. Verify Categories

```bash
psql "$DATABASE_URL" \
  -c "SELECT id, name, slug FROM \"Category\" ORDER BY name;"
```

**Expected:** At least 2 categories (professional-services, jobs)

#### 4. Verify Geography

```bash
psql "$DATABASE_URL" -c "
  SELECT COUNT(*) as countries FROM \"Country\";
  SELECT COUNT(*) as states FROM \"StateProvince\";
  SELECT COUNT(*) as cities FROM \"City\";
"
```

**Expected:** 1 country, 3 states, 3+ cities

#### 5. Verify Locations

```bash
psql "$DATABASE_URL" \
  -c "SELECT id, name, slug, state, country FROM \"Location\";"
```

**Expected:** At least 3 locations (NYC, SF, Denver)

#### 6. Verify Directories

```bash
psql "$DATABASE_URL" \
  -c "SELECT id, title, slug, subdomain, status FROM \"Directory\";"
```

**Expected:** At least 2-3 directories

#### 7. Verify Listings

```bash
psql "$DATABASE_URL" -c "
  SELECT COUNT(*) as total_listings FROM \"Listing\";
  SELECT COUNT(*) as pending FROM \"Listing\" WHERE status = 'PENDING';
  SELECT COUNT(*) as approved FROM \"Listing\" WHERE status = 'APPROVED';
"
```

**Expected:** Multiple listings with mixed statuses

#### 8. Verify Listing Addresses

```bash
psql "$DATABASE_URL" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\";"
```

**Expected:** Multiple addresses (at least 1 per listing)

#### 9. Verify Listing Categories

```bash
psql "$DATABASE_URL" \
  -c "SELECT COUNT(*) FROM \"ListingCategory\";"
```

**Expected:** Multiple category associations

#### 10. Test API Returns Seeded Data

```bash
curl http://localhost:3030/v1/directories
```

**Expected:** JSON array of directories with nested data (locations, listings, etc.)

**Verifies:**
- Public endpoints work
- Nested relations load correctly
- Only ACTIVE directories returned
- Only APPROVED listings included

### Success Criteria

- ✅ Seed script runs without errors
- ✅ Categories created
- ✅ Geography hierarchy created
- ✅ Locations created
- ✅ Directories created
- ✅ Listings created with addresses
- ✅ Category associations created
- ✅ Featured slots configured
- ✅ API returns seeded data correctly

---

## Task 13: Enhance Seed Script (If Needed)

### Goal
Ensure seed script is comprehensive for testing all features.

### Assessment

The existing `db/seed.ts` is **already comprehensive** and includes:

✅ **Geography Hierarchy:** Country → State → City → Postal Code
✅ **Admin User:** For authentication testing
✅ **Multiple Categories:** Professional Services, Jobs
✅ **Multiple Locations:** NYC, SF, Denver (with full geography references)
✅ **Multiple Directories:** At least 2-3 directories with different category/location combinations
✅ **Multiple Listings:** Mix of statuses (PENDING, APPROVED, REJECTED)
✅ **Listing Addresses:** Multiple addresses per listing
✅ **Category Associations:** Many-to-many relationships
✅ **Featured Slots:** HERO and PREMIUM tiers
✅ **LLM Configuration:** AI field configurations

### What's Well Implemented

1. **Idempotent Design:** Uses `upsert` everywhere, safe to run multiple times
2. **Complete Relations:** Proper foreign keys and joins
3. **Realistic Data:** Addresses, phone numbers, URLs are realistic
4. **Status Variety:** Mix of statuses to test filtering
5. **Geography Completeness:** Full hierarchy with actual IDs

### Potential Enhancements (Optional)

If you need to add more test data:

```typescript
// Add more categories
const healthcareCategory = await prisma.category.upsert({
  where: { slug: 'healthcare' },
  update: {},
  create: {
    name: 'Healthcare',
    slug: 'healthcare',
    description: 'Medical and healthcare services',
  },
});

// Add more states/cities
const texasState = await prisma.stateProvince.upsert({
  where: { code: 'TX' },
  update: {},
  create: {
    name: 'Texas',
    stateCode: 'TX',
    type: 'state',
    countryId: unitedStates.id,
    countryCode: 'US',
  },
});

// Add more listings for volume testing
for (let i = 1; i <= 50; i++) {
  // Create test listings programmatically
}
```

### Recommendation

**No changes needed.** The seed script is comprehensive and well-designed. It creates:
- Enough data to test all features
- Proper variety (statuses, locations, categories)
- Realistic relationships
- Idempotent operations

---

## Task 14: Start All Services for Integration Testing

### Goal
Verify all services start and communicate correctly.

### Steps

#### 1. Start Database

```bash
docker compose up -d db
```

#### 2. Verify Database Running

```bash
docker compose ps
```

**Expected:** `db` service status = "Up"

#### 3. Run Database Migrations

```bash
npx prisma migrate deploy --schema=./db/schema.prisma
```

**Or create tables directly:**
```bash
npx prisma db push --schema=./db/schema.prisma
```

#### 4. Seed Database

```bash
cd db
npx tsx seed.ts
```

#### 5. Start API Server (Terminal 1)

```bash
cd apps/api
npm run dev
```

**Watch for:**
```
[db] Database connection successful
API server listening on http://localhost:3030
```

#### 6. Test Public Endpoints

```bash
# Get all directories
curl http://localhost:3030/v1/directories

# Get specific directory by slug
curl http://localhost:3030/v1/directories/professional-services-new-york-city
```

**Expected:**
- JSON array of directories
- Only ACTIVE directories
- Only APPROVED listings
- Nested relations (category, location, listings, addresses)

#### 7. Test Admin Endpoints

```bash
# List all categories
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/categories

# List all directories
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/directories

# List all listings
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings
```

**Expected:** JSON arrays with all data (including PENDING, DRAFT, etc.)

#### 8. Test Crawler Endpoint

```bash
curl -X POST \
     -H "Authorization: Bearer your-crawler-token" \
     -H "Content-Type: application/json" \
     -d '{
       "listings": [
         {
           "title": "Crawler Test Business",
           "slug": "crawler-test-business",
           "websiteUrl": "https://crawlertest.com",
           "summary": "Test crawler ingestion",
           "addresses": [
             {
               "addressLine1": "999 Crawler Ave",
               "city": "New York",
               "region": "NY",
               "postalCode": "10001",
               "country": "US"
             }
           ],
           "categoryIds": [1]
         }
       ]
     }' \
     http://localhost:3030/v1/crawler/listings
```

**Expected:** HTTP 201 with created listings count

#### 9. Verify Data in Database

```bash
psql "$DATABASE_URL" -c "
  SELECT COUNT(*) as total_listings FROM \"Listing\";
  SELECT COUNT(*) as pending FROM \"Listing\" WHERE status = 'PENDING';
  SELECT COUNT(*) as approved FROM \"Listing\" WHERE status = 'APPROVED';
"
```

**Verify:** Counts match API responses

#### 10. Test CRUD Operations

Perform create, read, update, delete on each resource type:
- Categories
- Directories
- Listings

Use the API endpoints and verify changes persist in database.

### Success Criteria

All services should:
- ✅ Start without errors
- ✅ Connect to database successfully
- ✅ Serve public endpoints (unauthenticated)
- ✅ Serve admin endpoints (with authentication)
- ✅ Accept crawler ingestion
- ✅ Persist all changes to database
- ✅ Return consistent data across restarts

---

## Common Issues & Solutions

### Issue: Database Connection Failed

**Error:** `Can't reach database server at localhost:5432`

**Solution:**
```bash
# Start database
docker compose up -d db

# Verify it's running
docker compose ps

# Check logs
docker compose logs db
```

### Issue: Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npx prisma generate --schema=./db/schema.prisma
```

### Issue: Migration Not Applied

**Error:** Table doesn't exist

**Solution:**
```bash
# Apply migrations
npx prisma migrate deploy --schema=./db/schema.prisma

# Or push schema directly
npx prisma db push --schema=./db/schema.prisma
```

### Issue: Seed Script Fails

**Error:** Various Prisma errors

**Solution:**
```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="postgresql://postgres:password@localhost:5432/mega_directory"

# Generate Prisma client
npx prisma generate --schema=./db/schema.prisma

# Run seed
cd db && npx tsx seed.ts
```

### Issue: API Server Won't Start

**Error:** Port already in use

**Solution:**
```bash
# Kill existing process on port 3030
lsof -ti:3030 | xargs kill -9

# Or change port in config
export API_PORT=3031
```

---

## Automated Testing Script

Create `scripts/integration-test.sh`:

```bash
#!/bin/bash
set -e

echo "Starting integration tests..."

# Start database
docker compose up -d db
sleep 5

# Run migrations
npx prisma migrate deploy --schema=./db/schema.prisma

# Seed database
cd db && npx tsx seed.ts && cd ..

# Start API server in background
cd apps/api && npm run dev &
API_PID=$!
sleep 10

# Run tests
curl -f http://localhost:3030/health
curl -f http://localhost:3030/v1/directories

# Cleanup
kill $API_PID
docker compose down

echo "Integration tests passed!"
```

---

## Completion Checklist

- [ ] Database starts successfully
- [ ] Migrations applied
- [ ] Seed script runs successfully
- [ ] API server starts and connects to database
- [ ] Health endpoint returns 200
- [ ] Public endpoints return seeded data
- [ ] Admin endpoints return all data (including non-public)
- [ ] CRUD operations work for all resources
- [ ] Data persists across API server restarts
- [ ] Crawler endpoint accepts batch ingestion
- [ ] All tests pass

---

## Next Steps After Testing

Once all integration tests pass:

1. **Tag the release:**
   ```bash
   git tag -a v0.1.0-prisma-integration -m "API server now uses Prisma for database persistence"
   git push origin v0.1.0-prisma-integration
   ```

2. **Document any issues found**

3. **Update README with setup instructions**

4. **Create deployment guide**

5. **Set up CI/CD pipeline for automated testing**

---

**End of Testing Guide**
