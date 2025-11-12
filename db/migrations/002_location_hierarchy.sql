-- Geographic hierarchy tables and related foreign keys
-- Includes countries, states/provinces, cities, and postal codes plus
-- bridge columns on locations/listings for direct references

CREATE TABLE "Country" (
  "id" INTEGER PRIMARY KEY,
  "name" TEXT NOT NULL,
  "iso2" TEXT NOT NULL UNIQUE,
  "iso3" TEXT,
  "numericCode" TEXT,
  "phoneCode" TEXT,
  "capital" TEXT,
  "currency" TEXT,
  "currencyName" TEXT,
  "currencySymbol" TEXT,
  "tld" TEXT,
  "nativeName" TEXT,
  "region" TEXT,
  "subregion" TEXT,
  "translations" JSONB,
  "timezones" JSONB,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "emoji" TEXT,
  "emojiU" TEXT,
  "wikiDataId" TEXT,
  "hasStates" BOOLEAN NOT NULL DEFAULT TRUE,
  "hasPostalCodes" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "StateProvince" (
  "id" INTEGER PRIMARY KEY,
  "name" TEXT NOT NULL,
  "stateCode" TEXT,
  "type" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "countryId" INTEGER NOT NULL,
  "countryCode" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "StateProvince_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "StateProvince_countryId_idx" ON "StateProvince" ("countryId");
CREATE UNIQUE INDEX "StateProvince_countryId_stateCode_key" ON "StateProvince" ("countryId", "stateCode");

CREATE TABLE "City" (
  "id" INTEGER PRIMARY KEY,
  "name" TEXT NOT NULL,
  "asciiName" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "population" INTEGER,
  "timezone" TEXT,
  "wikiDataId" TEXT,
  "stateId" INTEGER,
  "stateCode" TEXT,
  "stateName" TEXT,
  "countryId" INTEGER NOT NULL,
  "countryCode" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "City_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "StateProvince"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "City_countryId_idx" ON "City" ("countryId");
CREATE INDEX "City_stateId_idx" ON "City" ("stateId");

CREATE TABLE "PostalCode" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "placeName" TEXT NOT NULL,
  "countryId" INTEGER NOT NULL,
  "countryCode" TEXT NOT NULL,
  "stateId" INTEGER,
  "stateCode" TEXT,
  "stateName" TEXT,
  "countyName" TEXT,
  "countyCode" TEXT,
  "cityId" INTEGER,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracy" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PostalCode_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PostalCode_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "StateProvince"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PostalCode_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PostalCode_country_code_idx" ON "PostalCode" ("countryId", "code");
CREATE INDEX "PostalCode_cityId_idx" ON "PostalCode" ("cityId");
CREATE UNIQUE INDEX "PostalCode_country_code_place_key" ON "PostalCode" ("countryId", "code", "placeName");

ALTER TABLE "Location"
  ADD COLUMN "countryId" INTEGER,
  ADD COLUMN "stateId" INTEGER,
  ADD COLUMN "cityId" INTEGER,
  ADD COLUMN "postalCodeId" INTEGER;

ALTER TABLE "Location"
  ADD CONSTRAINT "Location_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Location"
  ADD CONSTRAINT "Location_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "StateProvince"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Location"
  ADD CONSTRAINT "Location_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Location"
  ADD CONSTRAINT "Location_postalCodeId_fkey" FOREIGN KEY ("postalCodeId") REFERENCES "PostalCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Location_countryId_idx" ON "Location" ("countryId");
CREATE INDEX "Location_stateId_idx" ON "Location" ("stateId");
CREATE INDEX "Location_cityId_idx" ON "Location" ("cityId");
CREATE INDEX "Location_postalCodeId_idx" ON "Location" ("postalCodeId");

ALTER TABLE "Listing"
  ADD COLUMN "countryId" INTEGER,
  ADD COLUMN "stateId" INTEGER,
  ADD COLUMN "cityId" INTEGER,
  ADD COLUMN "postalCodeId" INTEGER;

ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "StateProvince"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_postalCodeId_fkey" FOREIGN KEY ("postalCodeId") REFERENCES "PostalCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Listing_countryId_idx" ON "Listing" ("countryId");
CREATE INDEX "Listing_stateId_idx" ON "Listing" ("stateId");
CREATE INDEX "Listing_cityId_idx" ON "Listing" ("cityId");
CREATE INDEX "Listing_postalCodeId_idx" ON "Listing" ("postalCodeId");
