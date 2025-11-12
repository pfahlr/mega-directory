# Geographic Seed Data

This directory documents the reference datasets that back the global location
hierarchy (countries → states/provinces → cities → postal codes). The actual
data remains outside the repository to keep the repo lightweight and to respect
the licenses of the original providers.

## Required Sources

| Dataset | Source | Notes |
| --- | --- | --- |
| Countries/States/Cities | [`dr5hn/countries-states-cities-database`](https://github.com/dr5hn/countries-states-cities-database) | Download the JSON release (`countries.json`, `states.json`, `cities.json`). |
| Postal Codes | [GeoNames Postal Code files](https://download.geonames.org/export/zip/) | Either download the full `allCountries.zip` and extract the `.txt` file or combine selected country files. |

Place the extracted files anywhere on disk and point the seed script to the
folder via the environment variables shown below. For quick smoke tests (and to
keep CI fast) the repo ships with the `sample/` subset that contains only a few
entries for the United States, Canada, and the United Arab Emirates.

## Running the Seeder

The Prisma-aware loader lives at `db/scripts/seedGeography.ts`. Run it with
`ts-node` (or your preferred TypeScript runner) once the database connection is
configured:

```bash
# Uses the bundled sample data
npx ts-node db/scripts/seedGeography.ts

# Point to the full dataset dump
GEO_DATASET_DIR="$HOME/datasets/geography" \
GEO_POSTAL_FILE="$HOME/datasets/geography/allCountries.txt" \
npx ts-node db/scripts/seedGeography.ts
```

### Environment Variables

- `GEO_DATASET_DIR` – directory containing `countries.json`, `states.json`, and
  `cities.json`. Defaults to `db/geography/sample`.
- `GEO_POSTAL_FILE` – absolute path to the GeoNames `.txt` file. Defaults to a
  file named `postal_codes.txt` inside `GEO_DATASET_DIR`.
- `GEO_CREATE_BATCH_SIZE` – optional batch size for Prisma `createMany`
  operations (default `500`).
- `GEO_POSTAL_BATCH_SIZE` – optional batch size for streaming postal inserts
  (default `2000`).

### Postal-Code-Less Countries & Fallbacks

Some countries do not issue postal codes. The seeding script automatically
tracks which countries received postal-code rows and marks `Country.hasPostalCodes`
accordingly. Countries with zero state/province entries are similarly marked via
`hasStates`, ensuring downstream application logic can fall back to city-level
filters.

## Sample Dataset

The `sample/` directory mirrors the schema of the upstream JSON/TXT files but
only includes a handful of records so tests can run quickly without the full
2GB+ datasets.
