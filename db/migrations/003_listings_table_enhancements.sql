-- Listings table enhancements for multi-category + multi-address support

-- Drop legacy single-category + address columns
ALTER TABLE "Listing"
  DROP CONSTRAINT IF EXISTS "Listing_categoryId_fkey";

ALTER TABLE "Listing"
  DROP COLUMN IF EXISTS "categoryId",
  DROP COLUMN IF EXISTS "addressLine1",
  DROP COLUMN IF EXISTS "addressLine2",
  DROP COLUMN IF EXISTS "city",
  DROP COLUMN IF EXISTS "region",
  DROP COLUMN IF EXISTS "postalCode",
  DROP COLUMN IF EXISTS "country",
  DROP COLUMN IF EXISTS "latitude",
  DROP COLUMN IF EXISTS "longitude";

DROP INDEX IF EXISTS "Listing_category_location_idx";

-- Listing/category bridge table
CREATE TABLE "ListingCategory" (
  "listingId" INTEGER NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ListingCategory_pkey" PRIMARY KEY ("listingId", "categoryId"),
  CONSTRAINT "ListingCategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ListingCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ListingCategory_categoryId_idx" ON "ListingCategory" ("categoryId");

CREATE UNIQUE INDEX "ListingCategory_primary_listing_key"
  ON "ListingCategory" ("listingId")
  WHERE "isPrimary" IS TRUE;

-- Listing addresses table
CREATE TABLE "ListingAddress" (
  "id" SERIAL PRIMARY KEY,
  "listingId" INTEGER NOT NULL,
  "label" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "region" TEXT,
  "postalCode" TEXT,
  "country" TEXT DEFAULT 'US',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
  "countryId" INTEGER,
  "stateId" INTEGER,
  "cityId" INTEGER,
  "postalCodeId" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ListingAddress_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ListingAddress_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ListingAddress_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "StateProvince"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ListingAddress_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ListingAddress_postalCodeId_fkey" FOREIGN KEY ("postalCodeId") REFERENCES "PostalCode"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ListingAddress_listingId_idx" ON "ListingAddress" ("listingId");
CREATE INDEX "ListingAddress_cityId_idx" ON "ListingAddress" ("cityId");
CREATE INDEX "ListingAddress_postalCodeId_idx" ON "ListingAddress" ("postalCodeId");

CREATE UNIQUE INDEX "ListingAddress_primary_listing_key"
  ON "ListingAddress" ("listingId")
  WHERE "isPrimary" IS TRUE;
