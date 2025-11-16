-- Core relational schema for Mega Directory
-- Includes directories, listings, categorization, featured slots, users, and LLM configs

CREATE TYPE "ListingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');
CREATE TYPE "DirectoryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'MODERATOR', 'CRAWLER');
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "FeaturedSlotTier" AS ENUM ('HERO', 'PREMIUM', 'STANDARD');
CREATE TYPE "LlmTargetType" AS ENUM ('LISTING', 'CATEGORY', 'DIRECTORY', 'SUBCATEGORY');

CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "displayName" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
  "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
  "apiTokenHash" TEXT,
  "lastLoginAt" TIMESTAMPTZ,
  "lastPasswordAt" TIMESTAMPTZ,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Category" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "heroImageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Location" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "state" TEXT,
  "country" TEXT DEFAULT 'US',
  "timezone" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "directory_pages" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "subdomain" TEXT NOT NULL UNIQUE,
  "subdirectory" TEXT NOT NULL UNIQUE,
  "hostname" TEXT,
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "introMarkdown" TEXT,
  "status" "DirectoryStatus" NOT NULL DEFAULT 'DRAFT',
  "featuredLimit" INTEGER NOT NULL DEFAULT 3,
  "meta_title" TEXT,
  "meta_description" TEXT,
  "meta_keywords" TEXT,
  "og_image_url" TEXT,
  "location_agnostic" BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "categoryId" INTEGER NOT NULL,
  "locationId" INTEGER,
  CONSTRAINT "directory_pages_categoryId_locationId_key" UNIQUE ("categoryId", "locationId"),
  CONSTRAINT "directory_pages_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "directory_pages_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Subcategory" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "categoryId" INTEGER NOT NULL,
  "parentId" INTEGER,
  CONSTRAINT "Subcategory_categoryId_slug_key" UNIQUE ("categoryId", "slug"),
  CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Subcategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Listing" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "tagline" TEXT,
  "summary" TEXT,
  "description" TEXT,
  "websiteUrl" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "city" TEXT,
  "region" TEXT,
  "postalCode" TEXT,
  "country" TEXT DEFAULT 'US',
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "priceRange" TEXT,
  "rating" DOUBLE PRECISION DEFAULT 0,
  "reviewCount" INTEGER DEFAULT 0,
  "score" DOUBLE PRECISION DEFAULT 0,
  "status" "ListingStatus" NOT NULL DEFAULT 'PENDING',
  "isClaimed" BOOLEAN NOT NULL DEFAULT FALSE,
  "isSponsored" BOOLEAN NOT NULL DEFAULT FALSE,
  "sourceName" TEXT,
  "sourceUrl" TEXT,
  "sourceId" TEXT UNIQUE,
  "crawlerRunId" TEXT,
  "rawPayload" JSONB,
  "generatedPayload" JSONB,
  "notes" TEXT,
  "ingestedAt" TIMESTAMPTZ DEFAULT NOW(),
  "approvedAt" TIMESTAMPTZ,
  "publishedAt" TIMESTAMPTZ,
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "categoryId" INTEGER NOT NULL,
  "locationId" INTEGER,
  "directoryId" INTEGER,
  "approvedById" INTEGER,
  CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Listing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Listing_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "directory_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Listing_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Listing_directoryId_idx" ON "Listing" ("directoryId");
CREATE INDEX "Listing_status_idx" ON "Listing" ("status");
CREATE INDEX "Listing_category_location_idx" ON "Listing" ("categoryId", "locationId");

CREATE TABLE "ListingSubcategory" (
  "listingId" INTEGER NOT NULL,
  "subcategoryId" INTEGER NOT NULL,
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("listingId", "subcategoryId"),
  CONSTRAINT "ListingSubcategory_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ListingSubcategory_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "FeaturedSlot" (
  "id" SERIAL PRIMARY KEY,
  "tier" "FeaturedSlotTier" NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 1,
  "label" TEXT,
  "startsAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endsAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "directoryId" INTEGER NOT NULL,
  "listingId" INTEGER,
  CONSTRAINT "FeaturedSlot_directoryId_tier_position_key" UNIQUE ("directoryId", "tier", "position"),
  CONSTRAINT "FeaturedSlot_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "directory_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FeaturedSlot_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "LlmFieldConfig" (
  "id" SERIAL PRIMARY KEY,
  "targetType" "LlmTargetType" NOT NULL,
  "fieldName" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'openrouter',
  "model" TEXT,
  "promptTemplate" TEXT NOT NULL,
  "stopSequences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "maxTokens" INTEGER DEFAULT 400,
  "temperature" DOUBLE PRECISION DEFAULT 0.7,
  "topP" DOUBLE PRECISION DEFAULT 1,
  "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "outputSchema" JSONB,
  "postProcessScript" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "LlmFieldConfig_targetType_fieldName_version_key" UNIQUE ("targetType", "fieldName", "version")
);
