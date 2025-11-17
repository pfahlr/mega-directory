# Import Script Testing Guide: Tasks 20-23

**Date:** 2025-11-17
**Tasks:** 20-23 from Database Persistence Migration Plan
**Status:** Documented (Requires Running Services)

---

## Overview

Tasks 20-23 test the **text_import.py** script with three different extraction modes (HTML, LLM, CSV) and verify that extracted data can be ingested into the API.

These tasks require:
1. Python environment with dependencies installed
2. Test data files (created in Task 19)
3. API server running (for Task 23)
4. Environment variables configured (for LLM mode)

---

## Prerequisites

### 1. Test Data Files (Task 19)

Verify test data files exist:
```bash
ls -lh test-data/
```

**Expected:**
- `sample-listings.html` (2.2K)
- `sample-listings.txt` (905B)
- `sample-listings.csv` (980B)

If missing, these were created in Task 19.

---

### 2. Python Dependencies

```bash
cd apps/crawler
pip list | grep -E "(beautifulsoup4|requests|jinja2)"
```

**Expected output:**
```
beautifulsoup4         4.12.x
jinja2                 3.1.x
requests               2.31.x
```

**If missing, install:**
```bash
pip install beautifulsoup4 requests jinja2
```

---

### 3. Environment Variables (LLM Mode Only)

For Task 21 (LLM extraction), you need an AI API key.

**Check if configured:**
```bash
grep -E "OPENROUTER_API_KEY|OPENAI_API_KEY" .env
```

**If missing, add to `.env`:**
```bash
# For OpenRouter (recommended)
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# OR for OpenAI
OPENAI_API_KEY=sk-your-key-here
```

**Note:** Task 21 can be skipped if you don't have an LLM API key. Tasks 20 and 22 don't require it.

---

### 4. Verify text_import.py Script Exists

```bash
ls -lh apps/crawler/text_import.py
```

**Expected:**
```
-rw-r--r-- 1 user user 23855 Nov 17 06:31 apps/crawler/text_import.py
```

---

## Task 20: Test HTML Import Mode

### Goal
Verify `text_import.py` can extract business listings from HTML files using CSS selectors.

### Type
**Manual Testing** - Requires running Python script and verifying output

### Duration
~10-15 minutes

---

### Step 1: Navigate to Crawler Directory

```bash
cd apps/crawler
```

---

### Step 2: Run HTML Extraction

```bash
python text_import.py \
  --input ../../test-data/sample-listings.html \
  --mode html \
  --output ../../test-output-html.json
```

**What this does:**
- Reads `sample-listings.html`
- Parses HTML using BeautifulSoup
- Finds elements with `[data-listing]` or `<article>` tags
- Extracts title, summary, website URL from CSS selectors
- Outputs JSON with structured listing data

---

### Step 3: Verify Script Completes Without Errors

**Expected output:**
```
Reading HTML from ../../test-data/sample-listings.html
Extracted 5 listings using HTML mode
Writing output to ../../test-output-html.json
```

**If errors:**
- Check file path is correct
- Check Python dependencies installed
- Check HTML file is valid

---

### Step 4: Verify Output File Created

```bash
ls -lh ../../test-output-html.json
```

**Expected:**
```
-rw-r--r-- 1 user user 1.5K Nov 17 08:00 ../../test-output-html.json
```

**Success Criteria:**
- ✅ File exists
- ✅ File size > 0 bytes

---

### Step 5: Review Extracted JSON Structure

```bash
cat ../../test-output-html.json | head -30
```

**Expected format:**
```json
{
  "listings": [
    {
      "title": "Acme Professional Services",
      "summary": "Expert consulting for small businesses...",
      "sourceUrl": "https://acmepros.example.com",
      ...
    },
    ...
  ]
}
```

**Success Criteria:**
- ✅ JSON has `"listings"` array at top level
- ✅ Each listing has `"title"` field
- ✅ Listings have `"summary"` and/or `"sourceUrl"`

---

### Step 6: Validate JSON is Well-Formed

```bash
python -m json.tool ../../test-output-html.json > /dev/null && echo "Valid JSON"
```

**Expected output:**
```
Valid JSON
```

**If error:**
- JSON is malformed
- Check script output for syntax errors
- Review HTML input for special characters

---

### Step 7: Count Extracted Listings

```bash
cat ../../test-output-html.json | python -c "import sys, json; print(len(json.load(sys.stdin)['listings']))"
```

**Expected output:**
```
5
```

**Why 5?**
- `sample-listings.html` contains 5 business listings
- All 5 should be extracted

**If different:**
- ❌ Some listings not extracted
- Check HTML selectors
- Review HTML structure

---

### Step 8: Verify Listing Fields Extracted

```bash
cat ../../test-output-html.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; print(f\"Title: {listing.get('title')}\nWebsite: {listing.get('sourceUrl')}\nSummary: {listing.get('summary')}\")"
```

**Expected output:**
```
Title: Acme Professional Services
Website: https://acmepros.example.com
Summary: Expert consulting for small businesses. We provide strategic planning, financial analysis, and operational improvements.
```

**Success Criteria:**
- ✅ Title extracted correctly
- ✅ Website URL extracted
- ✅ Summary/description extracted

---

### Step 9: Inspect All Extracted Listings

```bash
cat ../../test-output-html.json | python -c "import sys, json; listings = json.load(sys.stdin)['listings']; print('\n'.join([f\"{i+1}. {l.get('title')}\" for i, l in enumerate(listings)]))"
```

**Expected output:**
```
1. Acme Professional Services
2. Denver Tech Solutions
3. Bay Area Recruiters
4. HealthFirst Medical
5. EduTech Academy
```

**Success Criteria:**
- ✅ All 5 businesses extracted
- ✅ Titles match HTML source

---

### Step 10: Document HTML Extraction Success

**Create note:**
```
✓ Task 20 PASSED: HTML extraction mode works
  - Extracted 5 listings from sample-listings.html
  - All fields parsed correctly (title, summary, URL)
  - Output JSON is valid
  - BeautifulSoup CSS selectors working
```

---

### Task 20 Success Criteria

- ✅ Script runs without errors
- ✅ Output file created
- ✅ JSON is valid
- ✅ 5 listings extracted
- ✅ All expected fields present (title, summary, sourceUrl)
- ✅ Data matches HTML source

---

## Task 21: Test LLM Import Mode

### Goal
Verify `text_import.py` can extract structured data from unformatted plain text using an LLM (Large Language Model).

### Type
**Manual Testing** - Requires LLM API key

### Duration
~10-15 minutes (plus API call time)

---

### Prerequisites

**Required:** LLM API key (OpenRouter or OpenAI)

**If you don't have an API key:**
- Skip this task
- Continue to Task 22 (CSV import)
- LLM mode is optional for testing

---

### Step 1: Verify LLM API Key Available

```bash
grep OPENROUTER_API_KEY .env
```

**Or:**
```bash
grep OPENAI_API_KEY .env
```

**Expected:**
```
OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

**If missing:**
- Add to `.env` file
- Or set environment variable:
  ```bash
  export OPENROUTER_API_KEY=sk-or-v1-your-key-here
  ```

---

### Step 2: Run LLM Extraction (OpenRouter)

```bash
cd apps/crawler
python text_import.py \
  --input ../../test-data/sample-listings.txt \
  --mode llm \
  --llm-provider openrouter \
  --llm-model anthropic/claude-3.5-sonnet \
  --output ../../test-output-llm.json
```

**Or with OpenAI:**
```bash
python text_import.py \
  --input ../../test-data/sample-listings.txt \
  --mode llm \
  --llm-provider openai \
  --llm-model gpt-4o \
  --output ../../test-output-llm.json
```

**What this does:**
- Reads unstructured plain text from `sample-listings.txt`
- Sends text to LLM API
- LLM extracts structured data (title, phone, email, address, etc.)
- Returns JSON with structured listings

---

### Step 3: Verify LLM API Called Successfully

**Check console output:**

**Expected:**
```
Reading text from ../../test-data/sample-listings.txt
Calling LLM provider: openrouter
Model: anthropic/claude-3.5-sonnet
LLM request successful (tokens: XXX)
Extracted 5 listings using LLM mode
Writing output to ../../test-output-llm.json
```

**If authentication error:**
- ❌ Check API key is correct
- ❌ Check API key is valid (not expired)
- ❌ Check API key has credits/quota

**If rate limit error:**
- ⏳ Wait and retry
- Consider using different model/provider

---

### Step 4: Verify Output File Created

```bash
ls -lh ../../test-output-llm.json
```

**Expected:**
```
-rw-r--r-- 1 user user 2.0K Nov 17 08:05 ../../test-output-llm.json
```

**Note:** File size may be larger than HTML output (LLM extracts more fields)

---

### Step 5: Validate JSON is Well-Formed

```bash
python -m json.tool ../../test-output-llm.json > /dev/null && echo "Valid JSON"
```

**Expected output:**
```
Valid JSON
```

---

### Step 6: Count Extracted Listings

```bash
cat ../../test-output-llm.json | python -c "import sys, json; print(len(json.load(sys.stdin)['listings']))"
```

**Expected output:**
```
5
```

**From plain text file:**
- Acme Professional Services
- Denver Tech Solutions
- Bay Area Recruiters
- HealthFirst Medical
- EduTech Academy

---

### Step 7: Verify LLM Extracted Structured Data

```bash
cat ../../test-output-llm.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; print(json.dumps(listing, indent=2))" | head -20
```

**Expected output (example):**
```json
{
  "title": "Acme Professional Services",
  "summary": "Expert consulting for small businesses",
  "websiteUrl": "https://acmepros.example.com",
  "contactPhone": "(555) 123-4567",
  "contactEmail": "info@acmepros.example.com",
  "location": {
    "addressLine1": "123 Main St",
    "city": "New York",
    "region": "NY",
    "postalCode": "10001",
    "country": "US"
  }
}
```

**Success Criteria:**
- ✅ Title extracted
- ✅ Contact info extracted (phone, email)
- ✅ Location structured properly
- ✅ Website URL extracted

---

### Step 8: Compare LLM vs HTML Extraction Accuracy

**View both files side by side:**

**HTML extraction (Task 20):**
```bash
cat ../../test-output-html.json | python -c "import sys, json; print(json.dumps(json.load(sys.stdin)['listings'][0], indent=2))"
```

**LLM extraction (Task 21):**
```bash
cat ../../test-output-llm.json | python -c "import sys, json; print(json.dumps(json.load(sys.stdin)['listings'][0], indent=2))"
```

**Comparison:**
- **HTML mode:** Extracts only what's in HTML structure (title, summary, URL)
- **LLM mode:** Extracts ALL fields from text (phone, email, address, etc.)
- **LLM mode:** Structures location data (city, region, postalCode)

**Note:** LLM extraction is "smarter" but requires API calls and costs money.

---

### Step 9: Document LLM Extraction Success

**Create note:**
```
✓ Task 21 PASSED: LLM extraction mode works
  - Extracted 5 listings from unstructured plain text
  - LLM API call successful
  - Structured data extracted: phone, email, address
  - Location data parsed into city/region/postalCode
  - Output JSON is valid
```

---

### Task 21 Success Criteria

- ✅ LLM API key configured
- ✅ Script runs without errors
- ✅ LLM API call succeeds
- ✅ Output file created
- ✅ JSON is valid
- ✅ 5 listings extracted
- ✅ Structured fields extracted (phone, email, location)
- ✅ More detailed than HTML extraction

---

## Task 22: Test CSV Import Mode

### Goal
Verify `text_import.py` can import business listings from CSV files with automatic column mapping.

### Type
**Manual Testing** - No API key required

### Duration
~10 minutes

---

### Step 1: Run CSV Import

```bash
cd apps/crawler
python text_import.py \
  --input ../../test-data/sample-listings.csv \
  --mode csv \
  --output ../../test-output-csv.json
```

**What this does:**
- Reads CSV file with header row
- Maps columns: title, website, phone, email, description, address, city, state, zip
- Converts each row to structured JSON listing
- Handles empty fields gracefully

---

### Step 2: Verify Script Completes Without Errors

**Expected output:**
```
Reading CSV from ../../test-data/sample-listings.csv
Header columns: title, website, phone, email, description, address, city, state, zip
Extracted 6 listings using CSV mode
Writing output to ../../test-output-csv.json
```

**Success Criteria:**
- ✅ Script completes without exceptions
- ✅ All 6 rows processed

---

### Step 3: Verify Output File Created

```bash
ls -lh ../../test-output-csv.json
```

**Expected:**
```
-rw-r--r-- 1 user user 2.5K Nov 17 08:10 ../../test-output-csv.json
```

---

### Step 4: Validate JSON

```bash
python -m json.tool ../../test-output-csv.json > /dev/null && echo "Valid JSON"
```

**Expected output:**
```
Valid JSON
```

---

### Step 5: Count Extracted Listings

```bash
cat ../../test-output-csv.json | python -c "import sys, json; print(len(json.load(sys.stdin)['listings']))"
```

**Expected output:**
```
6
```

**Why 6?**
- `sample-listings.csv` has 7 lines (1 header + 6 data rows)
- 6 business listings should be extracted

---

### Step 6: Verify Column Mapping

```bash
cat ../../test-output-csv.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; print(f\"Title: {listing.get('title')}\nWebsite: {listing.get('websiteUrl')}\nPhone: {listing.get('contactPhone')}\nEmail: {listing.get('contactEmail')}\")"
```

**Expected output:**
```
Title: Acme Professional Services
Website: https://acmepros.example.com
Phone: (555) 123-4567
Email: info@acmepros.example.com
```

**Success Criteria:**
- ✅ `title` column → `title` field
- ✅ `website` column → `websiteUrl` field
- ✅ `phone` column → `contactPhone` field
- ✅ `email` column → `contactEmail` field

---

### Step 7: Verify Blank Field Handling

**Check listing without phone number (Bay Area Recruiters, row 3):**

```bash
cat ../../test-output-csv.json | python -c "import sys, json; listing = [l for l in json.load(sys.stdin)['listings'] if 'Bay Area' in l.get('title', '')][0]; print(f\"Phone: {listing.get('contactPhone')}\")"
```

**Expected output:**
```
Phone: None
```

**Or:**
```
Phone:
```

**Success Criteria:**
- ✅ Empty CSV field becomes `null` or empty string
- ❌ NOT "NaN", "undefined", or error

---

### Step 8: Verify Location Parsing

```bash
cat ../../test-output-csv.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; loc = listing.get('location', {}); print(f\"Address: {loc.get('addressLine1')}\nCity: {loc.get('city')}\nRegion: {loc.get('region')}\nPostal: {loc.get('postalCode')}\")"
```

**Expected output:**
```
Address: 123 Main St
City: New York
Region: NY
Postal: 10001
```

**Success Criteria:**
- ✅ `address` column → `location.addressLine1`
- ✅ `city` column → `location.city`
- ✅ `state` column → `location.region`
- ✅ `zip` column → `location.postalCode`

---

### Step 9: Verify Listing with Missing Location (EduTech Academy, row 5)

```bash
cat ../../test-output-csv.json | python -c "import sys, json; listing = [l for l in json.load(sys.stdin)['listings'] if 'EduTech' in l.get('title', '')][0]; print(json.dumps(listing, indent=2))"
```

**Expected:**
```json
{
  "title": "EduTech Academy",
  "websiteUrl": "https://edutech.example.com",
  "contactEmail": "support@edutech.example.com",
  "summary": "Online learning platform",
  "location": null
}
```

**Or location object with empty fields:**
```json
"location": {
  "addressLine1": "",
  "city": "",
  "region": "",
  "postalCode": ""
}
```

**Success Criteria:**
- ✅ Listing created even without address
- ✅ No errors/crashes
- ✅ Other fields still extracted

---

### Step 10: Document CSV Import Success

**Create note:**
```
✓ Task 22 PASSED: CSV import mode works
  - Imported 6 listings from sample-listings.csv
  - Column mapping works correctly
  - Empty fields handled gracefully (null/empty, not NaN)
  - Location data structured properly
  - Listings without addresses imported successfully
```

---

### Task 22 Success Criteria

- ✅ Script runs without errors
- ✅ Output file created
- ✅ JSON is valid
- ✅ 6 listings extracted
- ✅ Column mapping correct (title, website, phone, email)
- ✅ Empty fields handled (null, not error)
- ✅ Location fields structured (addressLine1, city, region, postalCode)
- ✅ Listings with missing addresses imported

---

## Task 23: Test API Ingestion Endpoint

### Goal
Verify that extracted listings (from Tasks 20-22) can be POST'ed to the API's `/v1/crawler/listings` endpoint and stored in the database.

### Type
**Manual Testing** - Requires API server running

### Duration
~15-20 minutes

---

### Prerequisites

**Required:**
1. API server running
2. Database running
3. Test output files created (Tasks 20-22)
4. Crawler bearer token configured

---

### Step 1: Verify API Server Running

```bash
curl http://localhost:3030/health
```

**Expected response:**
```json
{"status":"ok"}
```

**If error:**
- ❌ API server not running
- Start server: `cd apps/api && npm run dev`
- Wait for "Database connection successful"

---

### Step 2: Verify Crawler Bearer Token

**Check `.env` file:**
```bash
grep CRAWLER_BEARER_TOKEN .env
```

**Expected:**
```
CRAWLER_BEARER_TOKEN=VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA
```

**This token is used to authenticate crawler requests.**

---

### Step 3: POST HTML-Extracted Listings to API

**Go to project root:**
```bash
cd ../..  # if you're in apps/crawler
```

**POST the HTML output:**
```bash
curl -X POST \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     -H "Content-Type: application/json" \
     -d @test-output-html.json \
     http://localhost:3030/v1/crawler/listings
```

---

### Step 4: Verify 201 Created Response

**Expected response:**
```json
{
  "data": {
    "created": 5,
    "errors": 0,
    "listings": [
      {
        "id": 16,
        "title": "Acme Professional Services",
        "slug": "acme-professional-services",
        "status": "PENDING",
        ...
      },
      ...
    ],
    "failedListings": []
  }
}
```

**Success Criteria:**
- ✅ HTTP status: 201 Created
- ✅ `created`: 5
- ✅ `errors`: 0
- ✅ All 5 listings in response array

**If errors:**
- Check `failedListings` array for error messages
- Common issues: duplicate slugs, missing required fields

---

### Step 5: Check API Logs

**In API server terminal, look for:**
```
[crawler] POST /v1/crawler/listings
[crawler] Processing 5 listings
[crawler] Created 5 listings
```

**Success Criteria:**
- ✅ No error messages
- ✅ "Created X listings" logged

---

### Step 6: Verify Listings in Database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"Listing\" WHERE title LIKE '%Acme Professional%' OR title LIKE '%Denver Tech%';"
```

**Expected output:**
```
 count
-------
     2
(1 row)
```

**Or higher if you ran this test multiple times.**

**Success Criteria:**
- ✅ Count > 0 (listings created in database)

---

### Step 7: Verify Listing Status Set to PENDING

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT title, status FROM \"Listing\" WHERE title LIKE '%Acme Professional%' LIMIT 1;"
```

**Expected output:**
```
          title           | status
--------------------------+---------
 Acme Professional Services | PENDING
(1 row)
```

**Success Criteria:**
- ✅ `status = 'PENDING'`
- All crawler-imported listings start as PENDING
- Admin must approve them (change to APPROVED) to appear publicly

---

### Step 8: Verify in Admin UI (Optional)

**If admin UI is running:**

Open: http://localhost:4000/listings

**Expected:**
- New listings from import appear in list
- Titles: "Acme Professional Services", "Denver Tech Solutions", etc.
- Status: PENDING
- Can click Edit to review details

---

### Step 9: Test Duplicate Handling

**POST the same file again:**
```bash
curl -X POST \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     -H "Content-Type: application/json" \
     -d @test-output-html.json \
     http://localhost:3030/v1/crawler/listings
```

**Expected response:**
```json
{
  "data": {
    "created": 0,
    "errors": 5,
    "listings": [],
    "failedListings": [
      {
        "listing": { "title": "Acme Professional Services", ... },
        "error": "Duplicate slug"
      },
      ...
    ]
  }
}
```

**Success Criteria:**
- ✅ `created`: 0
- ✅ `errors`: 5
- ✅ `failedListings` shows "Duplicate slug" errors
- ✅ No new database records created

---

### Step 10: Verify Duplicate Not Created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT title, COUNT(*) FROM \"Listing\" WHERE title LIKE '%Acme Professional%' GROUP BY title;"
```

**Expected output:**
```
          title           | count
--------------------------+-------
 Acme Professional Services |     1
(1 row)
```

**Success Criteria:**
- ✅ Count = 1 (not 2)
- Duplicate slug prevented duplicate creation

---

### Step 11: Test CSV Import to API (Optional)

**POST CSV-extracted listings:**
```bash
curl -X POST \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     -H "Content-Type: application/json" \
     -d @test-output-csv.json \
     http://localhost:3030/v1/crawler/listings
```

**Expected:**
- Some may be duplicates (if same businesses in CSV as HTML)
- New businesses created (e.g., "Global Logistics Inc" is only in CSV)

---

### Step 12: Document API Ingestion Success

**Create note:**
```
✓ Task 23 PASSED: API ingestion endpoint works
  - POST /v1/crawler/listings accepts extracted data
  - 5 HTML-extracted listings created in database
  - Status set to PENDING correctly
  - Duplicate handling works (returns error, doesn't create)
  - Listings visible in admin UI
  - API logs show successful processing
```

---

### Task 23 Success Criteria

- ✅ API server running
- ✅ POST to /v1/crawler/listings succeeds (201)
- ✅ Response shows created listings
- ✅ Listings persisted to database
- ✅ Status set to PENDING
- ✅ Listings visible in admin UI
- ✅ API logs show processing
- ✅ Duplicate POST returns errors (doesn't create duplicates)
- ✅ Unique constraint enforced (slug uniqueness)

---

## Troubleshooting

### Issue: Script Not Found

**Error:** `python: can't open file 'text_import.py'`

**Solution:**
```bash
# Make sure you're in the right directory
cd apps/crawler
pwd  # Should show: /path/to/mega-directory/apps/crawler
```

---

### Issue: Missing Python Dependencies

**Error:** `ModuleNotFoundError: No module named 'bs4'`

**Solution:**
```bash
pip install beautifulsoup4 requests jinja2
```

---

### Issue: LLM API Authentication Failed

**Error:** `401 Unauthorized` or `Invalid API key`

**Solutions:**
1. Check API key is correct in `.env`
2. Check API key is valid (not expired)
3. Check you have credits/quota remaining
4. Try different provider (OpenRouter vs OpenAI)

---

### Issue: API Server Not Responding

**Error:** `Connection refused` on `curl http://localhost:3030/health`

**Solutions:**
1. Start API server:
   ```bash
   cd apps/api
   npm run dev
   ```
2. Wait for "Database connection successful"
3. Check API is on port 3030 (or configured port)

---

### Issue: CSV Import Shows Wrong Field Count

**Error:** `Expected 9 columns, got 7`

**Solutions:**
1. Check CSV has header row
2. Check CSV is comma-separated (not semicolon or tab)
3. Check for extra commas in fields (should be quoted)
4. Verify CSV format:
   ```bash
   head -2 test-data/sample-listings.csv
   ```

---

### Issue: Duplicate Slug Errors

**Error:** All listings fail with "Duplicate slug"

**Cause:** You already imported these listings earlier

**Solutions:**
1. **Option A:** Delete test listings from database:
   ```bash
   psql "$DATABASE_URL" -c "DELETE FROM \"Listing\" WHERE title LIKE '%Acme Professional%' OR title LIKE '%Denver Tech%';"
   ```
2. **Option B:** Modify test data files with different business names
3. **Option C:** This is expected behavior - duplicate handling works!

---

### Issue: Output JSON Has No Listings

**Error:** `{"listings": []}`

**Possible causes (HTML mode):**
1. CSS selectors don't match HTML structure
2. HTML file is empty or malformed
3. Encoding issues

**Debug:**
```bash
# View HTML structure
cat test-data/sample-listings.html | grep -A5 "data-listing"

# Try with more permissive selectors
python text_import.py \
  --input ../../test-data/sample-listings.html \
  --mode html \
  --html-listing-selector "article, div" \
  --output debug-output.json
```

---

## Summary: Tasks 20-23 Overview

### What Was Tested

| Task | Mode | Input File | Output File | Tests |
|------|------|------------|-------------|-------|
| 20 | HTML | sample-listings.html | test-output-html.json | BeautifulSoup extraction, CSS selectors |
| 21 | LLM | sample-listings.txt | test-output-llm.json | AI-powered text extraction, API calls |
| 22 | CSV | sample-listings.csv | test-output-csv.json | Column mapping, empty field handling |
| 23 | API | test-output-*.json | Database records | POST to API, duplicate handling |

### Extraction Modes Comparison

| Feature | HTML Mode | LLM Mode | CSV Mode |
|---------|-----------|----------|----------|
| **Input** | Structured HTML | Unstructured text | Structured CSV |
| **Parsing** | CSS selectors | AI/LLM | Column mapping |
| **Cost** | Free | $$$ (API calls) | Free |
| **Accuracy** | High (if selectors match) | Very high | Perfect (if columns right) |
| **Fields** | Limited (only in HTML) | All (AI extracts) | All (in CSV columns) |
| **Setup** | Need HTML structure | Need API key | Need CSV format |
| **Speed** | Fast | Slow (API latency) | Very fast |

### When to Use Each Mode

**HTML Mode:**
- You have scraped HTML from a website
- HTML has consistent structure
- CSS selectors can target listing elements
- Free, fast, reliable

**LLM Mode:**
- You have unstructured text (emails, documents, scraped pages without structure)
- Text has varied formats
- You need intelligent field extraction
- You have API budget

**CSV Mode:**
- You have data exports from other systems
- Data is already tabular
- Columns map to listing fields
- Fastest and most reliable

---

## Next Steps After Testing

Once all tests pass:

1. **Document results:**
   - Note which modes worked best
   - Record any issues encountered
   - Save output JSON files

2. **Use in production:**
   - `IMPORT_GUIDE.md` (created in Task 24) has full usage documentation
   - Run imports with real data sources
   - POST to API to ingest listings

3. **Automate:**
   - Create shell scripts for common import workflows
   - Schedule periodic imports with cron
   - Add monitoring/alerts

---

**End of Import Testing Guide**
