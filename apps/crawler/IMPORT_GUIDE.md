# Listing Import Guide

This guide explains how to use `text_import.py` to import business listings from various sources.

## Overview

The import script supports three extraction modes:

1. **HTML Mode** - Parse structured HTML with CSS selectors
2. **LLM Mode** - Extract data from plain text using AI
3. **CSV Mode** - Import from CSV files with column mapping

## Prerequisites

Install dependencies:
```bash
pip install beautifulsoup4 requests jinja2
```

Set environment variables (for LLM mode):
```bash
OPENROUTER_API_KEY=your-key-here
# or
OPENAI_API_KEY=your-key-here
```

## HTML Mode

Extract listings from HTML files using CSS selectors.

### Basic Usage

```bash
python text_import.py \
  --input scraped-data.html \
  --mode html \
  --output extracted.json
```

### Custom Selectors

```bash
python text_import.py \
  --input data.html \
  --mode html \
  --html-listing-selector ".business-card" \
  --html-title-selector "h3.name" \
  --html-link-selector "a.website" \
  --html-summary-selector "p.description" \
  --output extracted.json
```

**Default Selectors:**
- Listing container: `[data-listing], article`
- Title: `.listing-title, h1, h2, h3, a`
- Link: `a`
- Summary: `.listing-description, p`

## LLM Mode

Extract structured data from unformatted text using AI.

### OpenRouter (Recommended)

```bash
python text_import.py \
  --input raw-text.txt \
  --mode llm \
  --llm-provider openrouter \
  --llm-model anthropic/claude-3.5-sonnet \
  --output extracted.json
```

### OpenAI

```bash
python text_import.py \
  --input raw-text.txt \
  --mode llm \
  --llm-provider openai \
  --llm-model gpt-4o \
  --output extracted.json
```

### Custom Prompt

```bash
python text_import.py \
  --input text.txt \
  --mode llm \
  --llm-provider openrouter \
  --llm-model anthropic/claude-3.5-sonnet \
  --llm-prompt-file custom-prompt.txt \
  --output extracted.json
```

## CSV Mode

Import from CSV files with automatic column mapping.

### Basic Usage

```bash
python text_import.py \
  --input businesses.csv \
  --mode csv \
  --output extracted.json
```

### Expected CSV Format

```csv
title,website,phone,email,description,address,city,state,zip
Business Name,https://example.com,(555) 123-4567,info@example.com,Description,123 Main St,City,ST,12345
```

**Supported Columns:**
- `title` → listing title
- `website` → websiteUrl
- `phone` → contactPhone
- `email` → contactEmail
- `description` or `summary` → summary
- `address` → addressLine1
- `city` → location.city
- `state` or `region` → location.region
- `zip` or `postal_code` → location.postalCode

## Output Format

All modes produce JSON in this format:

```json
{
  "listings": [
    {
      "title": "Business Name",
      "slug": "auto-generated-slug",
      "websiteUrl": "https://example.com",
      "summary": "Business description",
      "contactPhone": "+1-555-123-4567",
      "contactEmail": "info@example.com",
      "location": {
        "addressLine1": "123 Main St",
        "city": "City Name",
        "region": "ST",
        "postalCode": "12345",
        "country": "US"
      }
    }
  ]
}
```

## Posting to API

After extraction, POST to the ingestion endpoint:

```bash
curl -X POST \
     -H "Authorization: Bearer $CRAWLER_BEARER_TOKEN" \
     -H "Content-Type: application/json" \
     -d @extracted.json \
     http://localhost:3030/v1/crawler/listings
```

Listings will be created with `status: PENDING`.

## End-to-End Workflow

1. **Acquire data** (scrape HTML, copy text, export CSV)
2. **Save to file** in `test-data/` directory
3. **Extract listings** using appropriate mode
4. **Review output** JSON for accuracy
5. **POST to API** using curl
6. **Approve in admin UI** (change status to APPROVED)

## Troubleshooting

### HTML Mode Issues

**Problem:** No listings extracted
- Check CSS selectors match HTML structure
- Use browser DevTools to inspect elements
- Try broader selectors (e.g., `article` instead of `.business-card`)

### LLM Mode Issues

**Problem:** API authentication error
- Verify API key in .env: `echo $OPENROUTER_API_KEY`
- Check key is valid and has credits

**Problem:** LLM returns invalid JSON
- Try different model (claude-3.5-sonnet more reliable)
- Simplify prompt
- Check input text isn't too long (>10k chars may cause issues)

### CSV Mode Issues

**Problem:** Fields not mapping correctly
- Verify CSV has header row
- Check column names match supported fields
- Use quotes for fields containing commas

### API Ingestion Issues

**Problem:** 401 Unauthorized
- Verify CRAWLER_BEARER_TOKEN in .env
- Check Authorization header format: `Bearer TOKEN`

**Problem:** Duplicate slug errors
- Slugs must be unique
- Manually edit JSON to make slugs unique
- Or allow API to skip duplicates (check response)

## Examples

See `test-data/` directory for sample files:
- `sample-listings.html` - HTML extraction example
- `sample-listings.txt` - LLM extraction example
- `sample-listings.csv` - CSV import example
