# Admin UI Testing Guide: Integration Tests (Tasks 15-18)

**Date:** 2025-11-17
**Tasks:** 15-18 from Database Persistence Migration Plan
**Status:** Documented (Requires Running Services and Admin UI)

---

## Overview

Tasks 15-18 are **manual UI integration tests** that verify the admin interface works correctly with the Prisma database backend. These tasks require:

1. PostgreSQL database running
2. API server running
3. Admin UI/frontend running
4. Browser access
5. Manual interaction with forms and UI elements

## Prerequisites

Before running these tests, ensure all services from Tasks 11-14 are running:

```bash
# 1. Database is running
docker compose up -d db

# 2. Database is migrated and seeded
npx prisma migrate deploy --schema=./db/schema.prisma
cd db && npx tsx seed.ts && cd ..

# 3. API server is running (Terminal 1)
cd apps/api
npm run dev
# Wait for: "Database connection successful"

# 4. Admin UI is running (Terminal 2)
cd apps/admin  # or wherever the admin UI is located
npm run dev
# Wait for: Server started message
```

**Expected Admin UI URL:** `http://localhost:4000` (or configured port)

---

## Task 15: Integration Test - Admin Listings CRUD

### Goal
Verify the admin UI can create, read, update, and delete listings through forms that interact with the Prisma database backend.

### Prerequisites
- All services running (database, API server, admin UI)
- Database seeded with test data (15+ listings from Task 12)

---

### Step 1: Navigate to Listings Page

Open your browser and navigate to:
```
http://localhost:4000/listings
```

**Expected:**
- Page loads successfully
- Listings table/grid is displayed
- Navigation/sidebar is visible

---

### Step 2: Verify Existing Listings Display

**What to Check:**
- Listings from seed data are displayed (should be 15+ listings)
- Listings show: title, status, contact info, etc.
- Different statuses visible: PENDING, APPROVED, REJECTED

**Seed Data Listings to Look For:**
- "Acme Professional Services" (APPROVED)
- "Denver Tech Solutions" (APPROVED)
- "SF Bay Recruiters" (PENDING)
- "Sample Business 4" through "Sample Business 15" (various statuses)

**Success Criteria:**
- ✅ At least 15 listings are visible
- ✅ Listings display complete information
- ✅ Mix of statuses shown

---

### Step 3: Click "Add New Listing" Button

Find and click the button to create a new listing. This might be labeled:
- "Add New Listing"
- "Create Listing"
- "+ New Listing"
- Or similar

**Expected:**
- Form opens (modal, new page, or inline form)
- Form fields are empty and ready for input

---

### Step 4: Fill Out Listing Form

**Basic Information:**
- **Title:** `Integration Test Listing`
- **Slug:** `integration-test-listing`
- **Website:** `https://integrationtest.example.com`
- **Phone:** `+1-555-TEST`
- **Email:** `test@integration.example.com`
- **Summary:** `This listing tests admin UI integration with Prisma database`
- **Status:** Select `PENDING` from dropdown

**Note:** Some fields may be optional depending on your form validation.

---

### Step 5: Add First Address

Look for "Add Address" or address fields section:

**Address #1:**
- **Address Line 1:** `100 Integration Blvd`
- **Address Line 2:** (leave empty or enter `Suite 100`)
- **City:** `Test City`
- **Region/State:** `TC`
- **Postal Code:** `99999`
- **Country:** `US`

---

### Step 6: Add Second Address

Click "Add Another Address" or similar button:

**Address #2:**
- **Address Line 1:** `200 Testing Ave`
- **Address Line 2:** (leave empty)
- **City:** `Test City`
- **Region/State:** `TC`
- **Postal Code:** `99998`
- **Country:** `US`

**Why test multiple addresses?**
- Verifies one-to-many relationship (Listing → ListingAddress)
- Tests nested creation in Prisma
- Validates form can handle arrays

---

### Step 7: Assign Categories

If your form includes category assignment:

**Select 2 categories:**
- Professional Services
- Technology (or Jobs, depending on seed data)

**What this tests:**
- Many-to-many relationship (Listing ↔ Category)
- ListingCategory join table creation

---

### Step 8: Submit Form

Click the submit button:
- "Save"
- "Create Listing"
- "Submit"
- Or similar

**Expected:**
- Form submits without errors
- Brief loading state (spinner or disabled button)
- Form closes/redirects

---

### Step 9: Verify Success Message

**Look for:**
- Success toast/notification
- "Listing created successfully" message
- Green checkmark or success indicator

**If error occurs:**
- Note the error message
- Check browser console (F12) for JavaScript errors
- Check API server terminal for backend errors
- Verify all required fields were filled

---

### Step 10: Verify Listing Appears in List

**Actions:**
- Scroll to top of listings page
- Or sort by "Most Recent" if available
- Or search for "Integration Test Listing"

**Expected:**
- Listing appears in the list
- Title: "Integration Test Listing"
- Status: PENDING
- Other fields visible

---

### Step 11: Note the Listing ID

**How to find ID:**
- Check URL if you click into the listing (e.g., `/listings/16`)
- Look for ID in listing card/row
- Or view in browser dev tools

**Write down the ID for later steps:** _________

**Expected ID:** 16 (if you had 15 seed listings)

---

### Step 12: Verify in Database

Open a terminal and run:

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT id, title, slug, status FROM \"Listing\" WHERE slug = 'integration-test-listing';"
```

**Expected Output:**
```
 id |          title          |           slug           | status
----+-------------------------+--------------------------+---------
 16 | Integration Test Listing| integration-test-listing | PENDING
(1 row)
```

**Success Criteria:**
- ✅ Row exists
- ✅ Title matches
- ✅ Slug matches
- ✅ Status is PENDING

---

### Step 13: Verify Addresses in Database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT id, \"listingId\", \"addressLine1\", city, \"postalCode\" FROM \"ListingAddress\" WHERE \"listingId\" = 16;"
```

**Expected Output:**
```
 id | listingId |    addressLine1      |   city    | postalCode
----+-----------+----------------------+-----------+------------
 XX |        16 | 100 Integration Blvd | Test City | 99999
 XX |        16 | 200 Testing Ave      | Test City | 99998
(2 rows)
```

**Success Criteria:**
- ✅ 2 address rows exist
- ✅ Both have `listingId = 16`
- ✅ Address data matches form input

---

### Step 14: Verify Category Associations (Optional)

If you assigned categories:

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT * FROM \"ListingCategory\" WHERE \"listingId\" = 16;"
```

**Expected:**
- 2 rows (one per category)
- `listingId = 16`
- `categoryId` values match selected categories

---

### Task 15 Success Criteria

- ✅ Admin UI listings page loads
- ✅ Seed data displays (15+ listings)
- ✅ Create listing form works
- ✅ Can add multiple addresses
- ✅ Can assign categories
- ✅ Success message appears
- ✅ New listing appears in UI
- ✅ Listing persists in database
- ✅ Addresses persist with correct foreign keys
- ✅ Category associations created

---

## Task 16: Integration Test - Data Persistence

### Goal
Verify that data created through the admin UI **survives API server restart**, confirming database persistence (not in-memory storage).

### Prerequisites
- Task 15 completed successfully
- "Integration Test Listing" created and visible
- All services currently running

---

### Step 1: Note Current Listing Count

**In Admin UI:**
- Count total listings on the page
- **Expected:** 16 listings (15 seed + 1 Integration Test Listing)

**Write down count:** _________

---

### Step 2: Stop API Server

**In Terminal 1 (where API server is running):**

Press `Ctrl+C` to stop the server

**Expected Output:**
```
^C
[server] Shutting down...
[db] Disconnecting from database...
```

---

### Step 3: Wait 5 Seconds

```bash
sleep 5
```

**Why wait?**
- Ensures server fully terminates
- Clears any in-memory state
- Simulates real restart scenario

---

### Step 4: Restart API Server

```bash
cd apps/api
npm run dev
```

**Wait for startup messages:**
```
[db] Database connection successful
API server listening on http://localhost:3030
```

**Do NOT refresh admin UI yet!**

---

### Step 5: Refresh Admin UI Listings Page

**In Browser:**
- Press `F5` (or Refresh button)
- Wait for page to reload

**What's being tested:**
- Admin UI fetches fresh data from restarted API
- API queries database (not in-memory cache)
- Data persisted across restart

---

### Step 6: Verify Listing Count Unchanged

**Count listings again**

**Expected:** Still **16 listings** (same as Step 1)

**If different:**
- ❌ FAILED - Data did not persist
- Check if API is using in-memory storage
- Check database connection logs

---

### Step 7: Verify Integration Test Listing Still Exists

**Actions:**
- Scroll through listings
- Or use search/filter for "Integration Test Listing"

**Expected:**
- ✅ Listing is visible
- ✅ All data intact (title, slug, addresses, etc.)
- ✅ Status still PENDING

---

### Step 8: Verify via API Endpoint

**In Terminal:**

```bash
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings | grep "integration-test-listing"
```

**Expected Output:**
```json
{
  "id": 16,
  "title": "Integration Test Listing",
  "slug": "integration-test-listing",
  ...
}
```

**Success Criteria:**
- ✅ Listing appears in API response
- ✅ Data matches what was created

---

### Step 9: Verify Addresses Persisted

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\" WHERE \"listingId\" = 16;"
```

**Expected Output:**
```
 count
-------
     2
(1 row)
```

**Success Criteria:**
- ✅ Count = 2
- ✅ Addresses survived restart

---

### Step 10: Document Persistence Test Success

**Create a note in your test log:**

```
✓ Task 16 PASSED: Data persists across API server restarts
  - 16 listings before restart
  - 16 listings after restart
  - Integration Test Listing intact
  - Addresses intact (2 addresses verified)
  - Database integration confirmed working
```

---

### Task 16 Success Criteria

- ✅ API server stopped cleanly
- ✅ API server restarted successfully
- ✅ Listing count unchanged (16)
- ✅ Integration Test Listing still visible in UI
- ✅ Listing data unchanged
- ✅ Addresses persisted (count = 2)
- ✅ API returns listing data correctly
- ✅ **Database persistence confirmed**

---

## Task 17: Integration Test - Update and Delete

### Goal
Verify the admin UI can **update** existing listings and **delete** listings, with proper cascade deletion of related records.

### Prerequisites
- Task 15 and 16 completed
- "Integration Test Listing" exists (ID: 16)
- All services running

---

### Step 1: Click Edit on Integration Test Listing

**In Admin UI:**
- Find "Integration Test Listing" in the list
- Click "Edit" button/icon/link

**Expected:**
- Edit form opens with pre-populated data
- All fields show current values
- Addresses are displayed (2 addresses)

---

### Step 2: Update Title

**Change title field:**
- **From:** `Integration Test Listing`
- **To:** `Updated Integration Test`

---

### Step 3: Update Status

**Change status dropdown:**
- **From:** `PENDING`
- **To:** `APPROVED`

**Why this matters:**
- Tests enum field updates
- APPROVED listings should appear in public directory endpoints

---

### Step 4: Add Third Address

**Click "Add Address" button:**

**Address #3:**
- **Address Line 1:** `300 Update Street`
- **Address Line 2:** (optional)
- **City:** `Test City`
- **Region/State:** `TC`
- **Postal Code:** `99997`
- **Country:** `US`

**What this tests:**
- Can add new addresses to existing listing
- Nested create in Prisma update operation

---

### Step 5: Save Changes

Click "Save" or "Update Listing" button

**Expected:**
- Form submits
- Success message appears
- Form closes/redirects to list

---

### Step 6: Verify Success Message

**Look for:**
- "Listing updated successfully"
- Success toast/notification

---

### Step 7: Verify Title Changed in UI

**In listings list:**
- Find the listing
- **Expected:** Now shows "Updated Integration Test"
- Status indicator shows "APPROVED" (green badge, etc.)

---

### Step 8: Verify Update in Database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT id, title, status FROM \"Listing\" WHERE id = 16;"
```

**Expected Output:**
```
 id |         title           |  status
----+-------------------------+----------
 16 | Updated Integration Test| APPROVED
(1 row)
```

**Success Criteria:**
- ✅ Title updated
- ✅ Status updated to APPROVED

---

### Step 9: Verify Third Address Added

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\" WHERE \"listingId\" = 16;"
```

**Expected Output:**
```
 count
-------
     3
(1 row)
```

**Verify third address data:**
```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT \"addressLine1\", \"postalCode\" FROM \"ListingAddress\" WHERE \"listingId\" = 16 ORDER BY id;"
```

**Expected:**
```
    addressLine1      | postalCode
----------------------+------------
 100 Integration Blvd | 99999
 200 Testing Ave      | 99998
 300 Update Street    | 99997
(3 rows)
```

**Success Criteria:**
- ✅ Count increased from 2 to 3
- ✅ Third address data correct

---

### Step 10: Create Disposable Test Listing

**Create a new listing to test deletion:**

**In Admin UI:**
- Click "Add New Listing"
- Fill minimal fields:
  - **Title:** `Delete Me Test`
  - **Slug:** `delete-me-test`
  - **Status:** PENDING
  - Add one address: `999 Delete St, Test City, TC, 99990, US`
- Save

**Expected:**
- Listing created successfully
- Note the ID (should be 17)

---

### Step 11: Delete the Disposable Listing

**In Admin UI:**
- Find "Delete Me Test" listing
- Click "Delete" button/icon
- **Confirm deletion** when prompted

**Expected:**
- Confirmation dialog appears
- After confirming: Success message
- Listing disappears from list

---

### Step 12: Verify Listing Removed from UI

**Check listings list:**
- Scroll through all listings
- Search for "Delete Me Test"

**Expected:**
- ✅ Listing not found
- ✅ Listing count decreased by 1

---

### Step 13: Verify Deletion in Database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"Listing\" WHERE id = 17;"
```

**Expected Output:**
```
 count
-------
     0
(1 row)
```

**Success Criteria:**
- ✅ Listing row deleted from database

---

### Step 14: Verify Addresses Cascade-Deleted

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\" WHERE \"listingId\" = 17;"
```

**Expected Output:**
```
 count
-------
     0
(1 row)
```

**What this proves:**
- Addresses were automatically deleted when listing was deleted
- Cascade delete is working (defined in Prisma schema)
- No orphaned address records

---

### Task 17 Success Criteria

**Update Tests:**
- ✅ Edit form loads with existing data
- ✅ Can update listing title
- ✅ Can update listing status
- ✅ Can add additional addresses to existing listing
- ✅ Updates persist to database
- ✅ Updated data visible in UI

**Delete Tests:**
- ✅ Can create disposable test listing
- ✅ Delete button works
- ✅ Confirmation dialog appears
- ✅ Listing removed from UI
- ✅ Listing deleted from database
- ✅ Related addresses cascade-deleted
- ✅ No orphaned records

---

## Task 18: Integration Test - Concurrent Operations

### Goal
Verify that multiple users (browser tabs) can work with the admin UI simultaneously, and changes made in one tab are reflected when the other tab refreshes.

### Prerequisites
- All previous tasks completed
- Admin UI running
- API server running

---

### Step 1: Open Admin UI in Second Browser Tab

**Tab 1:** Already open at `http://localhost:4000/listings`

**Tab 2:** Open new tab, navigate to `http://localhost:4000/listings`

**Expected:**
- Both tabs show the same listings
- Both tabs are independent browser sessions

---

### Step 2: Create Listing in Tab 1

**In Tab 1:**
- Click "Add New Listing"
- Fill form:
  - **Title:** `Concurrent Test A`
  - **Slug:** `concurrent-test-a`
  - **Status:** PENDING
  - Add one address: `111 Concurrent Ave, Test City, TC, 99996, US`
- Click Save

**Expected:**
- Success message in Tab 1
- Listing appears in Tab 1

---

### Step 3: Immediately Switch to Tab 2

**Switch to Tab 2 (do NOT refresh yet)**

**What to observe:**
- Tab 2 still shows OLD data (before new listing was created)
- "Concurrent Test A" is NOT visible yet

**Why?**
- Tab 2 hasn't fetched new data from API yet
- This is expected behavior

---

### Step 4: Note Listing Count in Tab 2

**In Tab 2 (before refresh):**
- Count listings

**Write down count:** _________ (should be 1 less than Tab 1)

---

### Step 5: Refresh Tab 2

**In Tab 2:**
- Press `F5` (or click Refresh button)

**Expected:**
- Page reloads
- Fetches fresh data from API
- API queries database

---

### Step 6: Verify New Listing Appears

**In Tab 2 (after refresh):**
- Look for "Concurrent Test A"

**Expected:**
- ✅ Listing is now visible in Tab 2
- ✅ Listing count increased by 1
- ✅ All data matches what was created in Tab 1

**What this proves:**
- Data created in one session is accessible in another session
- Database is the source of truth (not browser state)
- Concurrent access works

---

### Step 7: Update Listing in Tab 1

**In Tab 1:**
- Find "Concurrent Test A"
- Click Edit
- Change title to: `Concurrent Test A - Modified`
- Save

**Expected:**
- Update succeeds in Tab 1
- Title changes to "Concurrent Test A - Modified" in Tab 1

---

### Step 8: Switch to Tab 2 and Refresh

**In Tab 2:**
- Still shows old title: "Concurrent Test A"
- Press `F5` to refresh

---

### Step 9: Verify Update Appears

**In Tab 2 (after refresh):**
- Find the listing

**Expected:**
- ✅ Title now shows "Concurrent Test A - Modified"
- ✅ Changes from Tab 1 are visible in Tab 2

**What this proves:**
- Updates are persisted to database
- Multiple tabs can see each other's changes after refresh
- No data conflicts

---

### Step 10: Test Simultaneous Edits (Optional Advanced Test)

**If you want to test conflict handling:**

**Tab 1:**
- Start editing "Concurrent Test A - Modified"
- **Do NOT save yet**

**Tab 2:**
- Start editing the same listing
- Change status to APPROVED
- Save immediately

**Tab 1:**
- Now try to save your changes

**Expected behavior (depends on implementation):**
- **Option A:** Last write wins (Tab 1 overwrites Tab 2's change)
- **Option B:** Conflict detection error message
- **Option C:** Optimistic locking prevents overwrite

**Document which behavior occurs:** _________

---

### Step 11: Document Concurrent Access Success

**Create test log note:**

```
✓ Task 18 PASSED: Concurrent operations work correctly
  - Multiple browser tabs can access admin UI simultaneously
  - Changes in Tab 1 visible in Tab 2 after refresh
  - Creates work across tabs
  - Updates work across tabs
  - Database handles concurrent requests
  - No data corruption observed
```

---

### Task 18 Success Criteria

- ✅ Can open admin UI in multiple tabs
- ✅ Can create listing in one tab
- ✅ Other tab sees new listing after refresh
- ✅ Can update listing in one tab
- ✅ Other tab sees update after refresh
- ✅ No data corruption
- ✅ No race conditions observed
- ✅ Database handles concurrent writes

---

## Common Issues & Troubleshooting

### Issue: Admin UI Not Loading

**Error:** `ERR_CONNECTION_REFUSED` or blank page

**Solution:**
```bash
# Check if admin UI server is running
# If not, start it:
cd apps/admin  # or wherever admin UI is located
npm run dev
```

---

### Issue: "Authorization Failed" When Creating Listing

**Error:** 401 or 403 response

**Possible causes:**
1. Admin auth token not configured
2. Not logged in to admin UI
3. Session expired

**Solution:**
- Check if admin UI has login page
- Log in with admin credentials
- Check browser localStorage/cookies for auth token

---

### Issue: Listing Created in UI But Not in Database

**Error:** Data disappears after refresh

**Root Cause:** API is using in-memory storage, not database

**Solution:**
- Verify Tasks 7-10 were completed (API endpoints refactored to use Prisma)
- Check API logs for database connection errors
- Ensure `DATABASE_URL` environment variable is set
- Restart API server

---

### Issue: Addresses Not Saving

**Error:** Listing created, but addresses missing

**Check:**
1. API server logs for errors
2. Browser console for JavaScript errors
3. Network tab in dev tools (F12) for failed requests

**Common causes:**
- Required fields missing in address form
- Validation errors
- Nested create not configured in Prisma query

**Debug query:**
```bash
# Check if listing was created
psql "$DATABASE_URL" -c "SELECT * FROM \"Listing\" WHERE slug = 'integration-test-listing';"

# Check if addresses were created
psql "$DATABASE_URL" -c "SELECT * FROM \"ListingAddress\" WHERE \"listingId\" = 16;"
```

---

### Issue: Delete Doesn't Remove Addresses

**Error:** Listing deleted but addresses remain

**Root Cause:** Cascade delete not configured

**Check schema:**
```prisma
model Listing {
  id        Int      @id @default(autoincrement())
  // ...
  addresses ListingAddress[]  // Should have onDelete: Cascade
}

model ListingAddress {
  id        Int     @id @default(autoincrement())
  listingId Int
  listing   Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  // ^^^ onDelete: Cascade is required
}
```

---

### Issue: UI Shows Stale Data

**Error:** Changes not appearing even after refresh

**Possible causes:**
1. Browser caching
2. Service worker caching (if PWA)
3. API response caching
4. Wrong API endpoint

**Solution:**
```bash
# Hard refresh browser
Ctrl+Shift+R (Chrome/Firefox)
Cmd+Shift+R (Mac)

# Or clear browser cache
# Or open incognito/private window
```

---

### Issue: "Concurrent Test A" Not Appearing in Tab 2

**Error:** Listing created in Tab 1 but not visible in Tab 2 after refresh

**Check:**
1. Did you actually refresh Tab 2? (F5)
2. Is Tab 2 on the same URL?
3. Are both tabs authenticated?

**Debug:**
```bash
# Verify listing in database
psql "$DATABASE_URL" -c "SELECT id, title FROM \"Listing\" WHERE slug = 'concurrent-test-a';"

# Check API endpoint directly
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings | grep "concurrent-test-a"
```

---

## Summary: Tasks 15-18 Overview

### What Was Tested

| Task | Focus | What It Proves |
|------|-------|----------------|
| 15 | CRUD - Create & Read | Admin UI can create listings with addresses and categories via Prisma |
| 16 | Data Persistence | Data survives API restart (database storage, not in-memory) |
| 17 | CRUD - Update & Delete | Admin UI can update listings and delete with cascade |
| 18 | Concurrent Operations | Multiple users can work simultaneously without conflicts |

### Integration Points Verified

✅ **Admin UI → API Server:**
- Form submissions POST to correct endpoints
- Responses handled correctly
- Errors displayed to user

✅ **API Server → Database:**
- Prisma queries work for all CRUD operations
- Nested creates work (listing with addresses)
- Foreign keys enforced
- Cascade deletes work

✅ **Database → API Server:**
- Queries return correct data
- Relationships load correctly (includes)
- Data persists across restarts

✅ **API Server → Admin UI:**
- JSON responses parsed correctly
- Data displayed in UI
- Real-time updates (after refresh)

### Success Metrics

**For Tasks 15-18 to be marked "Complete":**

- [ ] Admin UI loads successfully
- [ ] Seed data displays (15+ listings)
- [ ] Can create listing with title, slug, addresses
- [ ] Listing persists to database
- [ ] Can assign categories (many-to-many)
- [ ] Can add multiple addresses (one-to-many)
- [ ] Data survives API server restart
- [ ] Can update listing (title, status)
- [ ] Can add addresses to existing listing
- [ ] Updates persist to database
- [ ] Can delete listing
- [ ] Addresses cascade-delete
- [ ] Multiple tabs can work concurrently
- [ ] Changes in one tab visible in another after refresh

---

## Next Steps After Testing

Once all tests pass:

1. **Document results:**
   - Create test report with screenshots
   - Note any bugs or issues found
   - Record browser/environment used

2. **Fix any issues found:**
   - Create GitHub issues for bugs
   - Prioritize critical issues
   - Update plan with findings

3. **Update README:**
   - Add admin UI setup instructions
   - Document testing procedures
   - Include troubleshooting tips

4. **Consider automation:**
   - Cypress or Playwright for E2E tests
   - Automate repetitive test scenarios
   - Add to CI/CD pipeline

---

**End of Admin UI Testing Guide**
