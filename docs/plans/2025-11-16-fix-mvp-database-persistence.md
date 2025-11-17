# Fix MVP Database Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix critical MVP issues preventing admin-API-database communication and enable full data persistence.

**Architecture:** Replace in-memory data structures in API server with Prisma ORM database queries, fix authentication tokens, seed test data, and verify end-to-end data flow from admin UI through API to PostgreSQL.

**Tech Stack:** TypeScript, Express.js, Prisma ORM, PostgreSQL, Node.js, EJS templates, Python (for import scripts)

---

## Prerequisites

**Required:**
- PostgreSQL database running (docker compose up -d db)
- Database migrations already applied
- All node_modules installed in workspaces
- Python environment with bs4, requests, jinja2 for import scripts

**Verify:**
```bash
# Database running
docker compose ps | grep db

# Check migrations applied
psql "postgresql://postgres:password@localhost:5432/mega_directory" -c "SELECT COUNT(*) FROM \"_prisma_migrations\";"

# Should show 16 tables
psql "postgresql://postgres:password@localhost:5432/mega_directory" -c "\dt"
```

---

## Task 1: Fix Environment Variables (Task 50)

**Goal:** Fix authentication token and add missing environment variables for API discovery.

**Files:**
- Modify: `.env`
- Modify: `.env.example`
- Modify: `README.md`
- Verify: `apps/web/astro.config.mjs`

### Step 1: Backup current .env file

```bash
cp .env .env.backup
```

### Step 2: Fix ADMIN_API_TOKEN in .env

**Current bug:** Token missing final 'A' character

Edit `.env` line 10:

**Before:**
```bash
ADMIN_API_TOKEN='VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0V'
```

**After:**
```bash
ADMIN_API_TOKEN='VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA'
```

### Step 3: Add PUBLIC_API_BASE_URL to .env

Add after line 11 (after ADMIN_API_BASE_URL):

```bash
PUBLIC_API_BASE_URL='http://localhost:3030'
```

### Step 4: Add API_BASE_URL to .env

Add after PUBLIC_API_BASE_URL:

```bash
API_BASE_URL='http://localhost:3030'
```

### Step 5: Verify token matching

```bash
# Should show identical tokens
grep CRAWLER_BEARER_TOKEN .env
grep ADMIN_API_TOKEN .env
```

Expected output:
```
CRAWLER_BEARER_TOKEN='VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA'
ADMIN_API_TOKEN='VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA'
```

### Step 6: Update .env.example

Edit `.env.example` to match all variables in `.env` (use placeholder values):

```bash
DATABASE_URL='postgresql://postgres:password@localhost:5432/mega_directory'
API_TOKEN='your-api-token-here'
OPENAI_API_KEY='your-openai-key'
OPENROUTER_API_KEY='your-openrouter-key'
GEMINI_API_KEY='your-gemini-key'
ADMIN_JWT_SECRET='your-jwt-secret-here'
ADMIN_LOGIN_EMAIL='admin@example.com'
ADMIN_LOGIN_PASSCODE='your-passcode-here'
CRAWLER_BEARER_TOKEN='your-crawler-token-here'
ADMIN_API_TOKEN='your-admin-token-here-must-match-crawler-token'
ADMIN_API_BASE_URL='http://localhost:3030'
PUBLIC_API_BASE_URL='http://localhost:3030'
API_BASE_URL='http://localhost:3030'
SKIP_CRAWLER=1
ADMIN_JWT_ISSUER='mega-directory'
ADMIN_JWT_AUDIENCE='admin'
ADMIN_TOKEN_TTL_SECONDS='900'
PORT='3001'
GEOCODEMAPS_API_KEY='your-geocode-key'
GOOGLEMAPS_API_KEY='your-google-maps-key'
```

### Step 7: Verify Astro config exposes PUBLIC_ variables

Read `apps/web/astro.config.mjs`:

```bash
cat apps/web/astro.config.mjs | grep -A5 "env"
```

Should show PUBLIC_ prefix variables are automatically exposed by Astro (no changes needed).

### Step 8: Test authentication fix

Start API server (in separate terminal):
```bash
cd apps/api && npm run dev
```

Test health endpoint:
```bash
curl http://localhost:3030/health
```

Expected: `{"status":"ok"}`

Test admin endpoint with fixed token:
```bash
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings
```

Expected: HTTP 200 (even if returns empty array `[]`)
NOT: HTTP 401 or 403

### Step 9: Commit environment variable fixes

```bash
git add .env .env.example
git commit -m "fix: correct ADMIN_API_TOKEN and add missing API URLs

- Fix ADMIN_API_TOKEN missing final 'A' character
- Add PUBLIC_API_BASE_URL for Astro frontend
- Add API_BASE_URL for dev scripts
- Update .env.example with all required variables
- Fixes admin UI authentication (401/403 errors)"
```

### Step 10: Update README.md with environment variables

Add section after installation instructions in `README.md`:

```markdown
## Environment Variables

Required environment variables in `.env`:

### Authentication
- `ADMIN_API_TOKEN` - Admin UI authentication token (must match `CRAWLER_BEARER_TOKEN`)
- `CRAWLER_BEARER_TOKEN` - Crawler authentication token
- `ADMIN_JWT_SECRET` - JWT signing secret for admin sessions
- `ADMIN_LOGIN_EMAIL` - Admin login email
- `ADMIN_LOGIN_PASSCODE` - Admin login passcode

### API Configuration
- `API_BASE_URL` - API server base URL (default: `http://localhost:3030`)
- `PUBLIC_API_BASE_URL` - Public API URL for Astro frontend (default: `http://localhost:3030`)
- `ADMIN_API_BASE_URL` - Admin API URL (default: `http://localhost:3030`)
- `PORT` - Admin UI server port (default: `3001`)

### Database
- `DATABASE_URL` - PostgreSQL connection string

### External APIs (optional)
- `OPENAI_API_KEY` - OpenAI API key for LLM features
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM features
- `GEMINI_API_KEY` - Google Gemini API key
- `GEOCODEMAPS_API_KEY` - GeocodeMAPS API key
- `GOOGLEMAPS_API_KEY` - Google Maps API key

### Features
- `SKIP_CRAWLER=1` - Disable automatic crawler startup

**Important:** `ADMIN_API_TOKEN` and `CRAWLER_BEARER_TOKEN` must have identical values.
```

### Step 11: Commit README update

```bash
git add README.md
git commit -m "docs: add environment variables section to README"
```

---

## Task 2: Install Prisma Client in API Server (Task 51 - Part 1)

**Goal:** Add Prisma Client dependency to API server workspace.

**Files:**
- Modify: `apps/api/package.json`

### Step 1: Add @prisma/client dependency

```bash
cd apps/api
npm install @prisma/client
```

### Step 2: Generate Prisma Client from schema

```bash
npx prisma generate --schema=../../db/schema.prisma
```

Expected output:
```
✔ Generated Prisma Client (X.X.X) to ./node_modules/@prisma/client in XXms
```

### Step 3: Verify Prisma types generated

```bash
ls -la node_modules/@prisma/client
```

Should show generated files including `index.d.ts`.

### Step 4: Commit Prisma Client addition

```bash
git add package.json package-lock.json
git commit -m "feat: add @prisma/client dependency to API server"
```

---

## Task 3: Create Database Service Module (Task 51 - Part 2)

**Goal:** Create reusable database service with Prisma client and helper functions.

**Files:**
- Create: `apps/api/src/db.ts`

### Step 1: Create db.ts with Prisma client initialization

Create `apps/api/src/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

/**
 * Initialize Prisma connection and test database connectivity
 */
export async function initializePrisma(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[db] Database connection successful');
  } catch (error) {
    console.error('[db] Database connection failed:', error);
    throw new Error('Failed to connect to database');
  }
}

/**
 * Gracefully disconnect Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[db] Database connection closed');
  } catch (error) {
    console.error('[db] Error disconnecting from database:', error);
  }
}

/**
 * Get listings with full relations (addresses and categories)
 */
export async function getListingsWithRelations(filters: {
  status?: string;
  directoryId?: number;
} = {}) {
  const where: any = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.directoryId) {
    where.directoryId = filters.directoryId;
  }

  return await prisma.listing.findMany({
    where,
    include: {
      addresses: true,
      categories: {
        include: {
          category: true,
        },
      },
      directory: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get all directories with nested data
 */
export async function getDirectoriesWithData() {
  return await prisma.directory.findMany({
    include: {
      category: true,
      location: {
        include: {
          city: {
            include: {
              stateProvince: {
                include: {
                  country: true,
                },
              },
            },
          },
        },
      },
      listings: {
        where: {
          status: 'APPROVED',
        },
        include: {
          addresses: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      },
      featuredSlots: {
        include: {
          listing: true,
        },
        orderBy: [
          { slotType: 'asc' }, // HERO first, then PREMIUM, then STANDARD
          { position: 'asc' },
        ],
      },
    },
    where: {
      status: 'PUBLISHED',
    },
  });
}

/**
 * Create listing with address atomically
 */
export async function createListingWithAddress(data: {
  title: string;
  slug: string;
  websiteUrl?: string;
  summary?: string;
  addresses: Array<{
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }>;
  categoryIds?: number[];
  status?: string;
  directoryId?: number;
}) {
  return await prisma.listing.create({
    data: {
      title: data.title,
      slug: data.slug,
      websiteUrl: data.websiteUrl,
      summary: data.summary,
      status: data.status || 'PENDING',
      directoryId: data.directoryId,
      addresses: {
        create: data.addresses,
      },
      ...(data.categoryIds && {
        categories: {
          create: data.categoryIds.map(categoryId => ({
            categoryId,
          })),
        },
      }),
    },
    include: {
      addresses: true,
      categories: {
        include: {
          category: true,
        },
      },
    },
  });
}
```

### Step 2: Commit database service module

```bash
git add src/db.ts
git commit -m "feat: create database service module with Prisma helpers

- Initialize PrismaClient with connection handling
- Add initializePrisma() for startup connection test
- Add disconnectPrisma() for graceful shutdown
- Add getListingsWithRelations() helper
- Add getDirectoriesWithData() helper
- Add createListingWithAddress() for atomic operations"
```

---

## Task 4: Add Type Definitions (Task 51 - Part 3)

**Goal:** Extract type definitions for better TypeScript support.

**Files:**
- Create: `apps/api/src/types.ts`

### Step 1: Create types.ts with extracted interfaces

Create `apps/api/src/types.ts`:

```typescript
/**
 * Type definitions for API server
 */

export type ListingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type DirectoryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type SlotType = 'HERO' | 'PREMIUM' | 'STANDARD';

export interface ListingAddress {
  id: number;
  listingId: number;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Directory {
  id: number;
  title: string;
  slug: string;
  subdomain: string;
  subdirectory: string;
  status: DirectoryStatus;
  categoryId: number;
  locationId?: number | null;
  locationAgnostic: boolean;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Listing {
  id: number;
  title: string;
  slug: string;
  status: ListingStatus;
  websiteUrl?: string | null;
  summary?: string | null;
  description?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  directoryId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListingWithRelations extends Listing {
  addresses: ListingAddress[];
  categories: Array<{
    category: Category;
  }>;
  directory?: Directory | null;
}
```

### Step 2: Commit type definitions

```bash
git add src/types.ts
git commit -m "feat: add TypeScript type definitions for API models"
```

---

## Task 5: Refactor API Server - Remove In-Memory Storage (Task 51 - Part 4)

**Goal:** Remove AdminStore in-memory data structures and replace with database queries.

**Files:**
- Modify: `apps/api/src/server.ts`

### Step 1: Read current server.ts to understand structure

```bash
wc -l apps/api/src/server.ts
```

This file is ~800 lines. We'll refactor it section by section.

### Step 2: Add Prisma imports at top of server.ts

At the top of `apps/api/src/server.ts` (after existing imports), add:

```typescript
import { initializePrisma, disconnectPrisma, prisma, getListingsWithRelations, getDirectoriesWithData, createListingWithAddress } from './db';
import { ListingWithRelations, ListingStatus, DirectoryStatus } from './types';
```

### Step 3: Remove AdminStore interface and initialization

Find and DELETE lines 138-157 in `apps/api/src/server.ts`:

```typescript
// DELETE THIS ENTIRE SECTION:
interface AdminStore {
  categories: CategoryRecord[];
  directories: DirectoryRecord[];
  listings: AdminListingRecord[];
  addresses: ListingAddressRecord[];
  nextCategoryId: number;
  nextDirectoryId: number;
  nextListingId: number;
  nextAddressId: number;
}

const adminStore: AdminStore = {
  categories: [],
  directories: [],
  listings: [],
  addresses: [],
  nextCategoryId: 1,
  nextDirectoryId: 1,
  nextListingId: 1,
  nextAddressId: 1,
};
```

### Step 4: Add database initialization to server startup

Find the server startup code (near bottom of file, around line 780). Replace:

```typescript
const port = parseInt(process.env.PORT || '3030', 10);
app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
```

With:

```typescript
const port = parseInt(process.env.PORT || '3030', 10);

// Initialize database connection
initializePrisma()
  .then(() => {
    app.listen(port, () => {
      console.log(`API server listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await disconnectPrisma();
  process.exit(0);
});
```

### Step 5: Commit server.ts initialization changes

```bash
git add src/server.ts
git commit -m "refactor: replace in-memory storage with Prisma database

- Remove AdminStore interface and in-memory arrays
- Add Prisma imports (db, types)
- Initialize Prisma connection on server startup
- Add graceful shutdown handlers for database disconnect"
```

---

## Task 6: Refactor Admin Listings Endpoints (Task 51 - Part 5)

**Goal:** Replace in-memory listing operations with Prisma queries.

**Files:**
- Modify: `apps/api/src/server.ts` (admin listings endpoints)

### Step 1: Replace GET /v1/admin/listings

Find the GET endpoint handler (around line 400). Replace:

```typescript
// OLD:
app.get('/v1/admin/listings', requireAuth, (req, res) => {
  res.json({ data: adminStore.listings });
});
```

With:

```typescript
// NEW:
app.get('/v1/admin/listings', requireAuth, async (req, res) => {
  try {
    const listings = await getListingsWithRelations();
    res.json({ data: listings });
  } catch (error) {
    console.error('[admin] Failed to fetch listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});
```

### Step 2: Replace POST /v1/admin/listings

Find the POST endpoint handler. Replace with:

```typescript
app.post('/v1/admin/listings', requireAuth, async (req, res) => {
  try {
    const { title, slug, websiteUrl, summary, addresses, categoryIds, status, directoryId } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: 'title and slug are required' });
    }

    const listing = await createListingWithAddress({
      title,
      slug,
      websiteUrl,
      summary,
      addresses: addresses || [],
      categoryIds,
      status: status || 'PENDING',
      directoryId,
    });

    res.status(201).json({ data: listing });
  } catch (error: any) {
    console.error('[admin] Failed to create listing:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Listing with this slug already exists' });
    }

    res.status(500).json({ error: 'Failed to create listing' });
  }
});
```

### Step 3: Replace PUT /v1/admin/listings/:id

Find the PUT endpoint handler. Replace with:

```typescript
app.put('/v1/admin/listings/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, slug, websiteUrl, summary, status } = req.body;

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(summary !== undefined && { summary }),
        ...(status && { status: status as ListingStatus }),
      },
      include: {
        addresses: true,
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    res.json({ data: listing });
  } catch (error: any) {
    console.error('[admin] Failed to update listing:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Listing with this slug already exists' });
    }

    res.status(500).json({ error: 'Failed to update listing' });
  }
});
```

### Step 4: Replace DELETE /v1/admin/listings/:id

Find the DELETE endpoint handler. Replace with:

```typescript
app.delete('/v1/admin/listings/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.listing.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('[admin] Failed to delete listing:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.status(500).json({ error: 'Failed to delete listing' });
  }
});
```

### Step 5: Commit admin listings endpoint refactor

```bash
git add src/server.ts
git commit -m "refactor: replace admin listings endpoints with Prisma queries

- GET /v1/admin/listings uses getListingsWithRelations()
- POST creates listing with nested addresses atomically
- PUT updates listing with proper error handling
- DELETE removes listing with cascade (addresses auto-deleted)
- Add Prisma error code handling (P2002, P2025)"
```

---

## Task 7: Refactor Admin Categories Endpoints (Task 51 - Part 6)

**Goal:** Replace in-memory category operations with Prisma queries.

**Files:**
- Modify: `apps/api/src/server.ts` (admin categories endpoints)

### Step 1: Replace GET /v1/admin/categories

Find and replace:

```typescript
// NEW:
app.get('/v1/admin/categories', requireAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ data: categories });
  } catch (error) {
    console.error('[admin] Failed to fetch categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});
```

### Step 2: Replace POST /v1/admin/categories

```typescript
app.post('/v1/admin/categories', requireAuth, async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required' });
    }

    const category = await prisma.category.create({
      data: { name, slug, description },
    });

    res.status(201).json({ data: category });
  } catch (error: any) {
    console.error('[admin] Failed to create category:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Category with this slug already exists' });
    }

    res.status(500).json({ error: 'Failed to create category' });
  }
});
```

### Step 3: Replace PUT /v1/admin/categories/:id

```typescript
app.put('/v1/admin/categories/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, slug, description } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
      },
    });

    res.json({ data: category });
  } catch (error: any) {
    console.error('[admin] Failed to update category:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(500).json({ error: 'Failed to update category' });
  }
});
```

### Step 4: Replace DELETE /v1/admin/categories/:id

```typescript
app.delete('/v1/admin/categories/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.category.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('[admin] Failed to delete category:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Cannot delete category with associated listings' });
    }

    res.status(500).json({ error: 'Failed to delete category' });
  }
});
```

### Step 5: Commit admin categories endpoint refactor

```bash
git add src/server.ts
git commit -m "refactor: replace admin categories endpoints with Prisma

- GET /v1/admin/categories fetches from database
- POST creates category with duplicate check
- PUT updates category with error handling
- DELETE prevents deletion if category has listings"
```

---

## Task 8: Refactor Admin Directories Endpoints (Task 51 - Part 7)

**Goal:** Replace in-memory directory operations with Prisma queries.

**Files:**
- Modify: `apps/api/src/server.ts` (admin directories endpoints)

### Step 1: Replace GET /v1/admin/directories

```typescript
app.get('/v1/admin/directories', requireAuth, async (req, res) => {
  try {
    const directories = await prisma.directory.findMany({
      include: {
        category: true,
        location: {
          include: {
            city: {
              include: {
                stateProvince: {
                  include: {
                    country: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: directories });
  } catch (error) {
    console.error('[admin] Failed to fetch directories:', error);
    res.status(500).json({ error: 'Failed to fetch directories' });
  }
});
```

### Step 2: Replace GET /v1/admin/directories/:id

```typescript
app.get('/v1/admin/directories/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const directory = await prisma.directory.findUnique({
      where: { id },
      include: {
        category: true,
        location: {
          include: {
            city: {
              include: {
                stateProvince: {
                  include: {
                    country: true,
                  },
                },
              },
            },
          },
        },
        listings: {
          include: {
            addresses: true,
          },
        },
      },
    });

    if (!directory) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    res.json({ data: directory });
  } catch (error) {
    console.error('[admin] Failed to fetch directory:', error);
    res.status(500).json({ error: 'Failed to fetch directory' });
  }
});
```

### Step 3: Replace POST /v1/admin/directories

```typescript
app.post('/v1/admin/directories', requireAuth, async (req, res) => {
  try {
    const {
      title,
      slug,
      subdomain,
      subdirectory,
      categoryId,
      locationId,
      locationAgnostic,
      status,
      heroTitle,
      heroSubtitle,
      metaTitle,
      metaDescription,
    } = req.body;

    if (!title || !slug || !subdomain || !subdirectory || !categoryId) {
      return res.status(400).json({
        error: 'title, slug, subdomain, subdirectory, and categoryId are required',
      });
    }

    const directory = await prisma.directory.create({
      data: {
        title,
        slug,
        subdomain,
        subdirectory,
        categoryId,
        locationId,
        locationAgnostic: locationAgnostic || false,
        status: status || 'DRAFT',
        heroTitle,
        heroSubtitle,
        metaTitle,
        metaDescription,
      },
      include: {
        category: true,
        location: true,
      },
    });

    res.status(201).json({ data: directory });
  } catch (error: any) {
    console.error('[admin] Failed to create directory:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Directory with this slug/subdomain already exists' });
    }

    res.status(500).json({ error: 'Failed to create directory' });
  }
});
```

### Step 4: Replace PUT /v1/admin/directories/:id

```typescript
app.put('/v1/admin/directories/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      title,
      slug,
      subdomain,
      subdirectory,
      categoryId,
      locationId,
      locationAgnostic,
      status,
      heroTitle,
      heroSubtitle,
      metaTitle,
      metaDescription,
    } = req.body;

    const directory = await prisma.directory.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(slug && { slug }),
        ...(subdomain && { subdomain }),
        ...(subdirectory && { subdirectory }),
        ...(categoryId && { categoryId }),
        ...(locationId !== undefined && { locationId }),
        ...(locationAgnostic !== undefined && { locationAgnostic }),
        ...(status && { status: status as DirectoryStatus }),
        ...(heroTitle !== undefined && { heroTitle }),
        ...(heroSubtitle !== undefined && { heroSubtitle }),
        ...(metaTitle !== undefined && { metaTitle }),
        ...(metaDescription !== undefined && { metaDescription }),
      },
      include: {
        category: true,
        location: true,
      },
    });

    res.json({ data: directory });
  } catch (error: any) {
    console.error('[admin] Failed to update directory:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Directory not found' });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Directory with this slug/subdomain already exists' });
    }

    res.status(500).json({ error: 'Failed to update directory' });
  }
});
```

### Step 5: Replace DELETE /v1/admin/directories/:id

```typescript
app.delete('/v1/admin/directories/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    await prisma.directory.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('[admin] Failed to delete directory:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Directory not found' });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({ error: 'Cannot delete directory with associated listings' });
    }

    res.status(500).json({ error: 'Failed to delete directory' });
  }
});
```

### Step 6: Commit admin directories endpoint refactor

```bash
git add src/server.ts
git commit -m "refactor: replace admin directories endpoints with Prisma

- GET /v1/admin/directories fetches with nested relations
- GET /v1/admin/directories/:id includes listings
- POST creates directory with validation
- PUT updates directory with error handling
- DELETE prevents deletion if directory has listings"
```

---

## Task 9: Refactor Public Endpoints (Task 51 - Part 8)

**Goal:** Replace public directory endpoints with database queries.

**Files:**
- Modify: `apps/api/src/server.ts` (public endpoints)

### Step 1: Replace GET /v1/directories

```typescript
app.get('/v1/directories', async (req, res) => {
  try {
    const directories = await getDirectoriesWithData();
    res.json({ data: directories });
  } catch (error) {
    console.error('[public] Failed to fetch directories:', error);
    res.status(500).json({ error: 'Failed to fetch directories' });
  }
});
```

### Step 2: Replace GET /v1/directories/:slug

```typescript
app.get('/v1/directories/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const directory = await prisma.directory.findUnique({
      where: { slug },
      include: {
        category: true,
        location: {
          include: {
            city: {
              include: {
                stateProvince: {
                  include: {
                    country: true,
                  },
                },
              },
            },
          },
        },
        listings: {
          where: {
            status: 'APPROVED',
          },
          include: {
            addresses: true,
            categories: {
              include: {
                category: true,
              },
            },
          },
        },
        featuredSlots: {
          include: {
            listing: {
              include: {
                addresses: true,
              },
            },
          },
          orderBy: [
            { slotType: 'asc' },
            { position: 'asc' },
          ],
        },
      },
    });

    if (!directory) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    if (directory.status !== 'PUBLISHED') {
      return res.status(404).json({ error: 'Directory not found' });
    }

    res.json({ data: directory });
  } catch (error) {
    console.error('[public] Failed to fetch directory:', error);
    res.status(500).json({ error: 'Failed to fetch directory' });
  }
});
```

### Step 3: Commit public endpoints refactor

```bash
git add src/server.ts
git commit -m "refactor: replace public directory endpoints with Prisma

- GET /v1/directories uses getDirectoriesWithData()
- GET /v1/directories/:slug fetches with full relations
- Filter for PUBLISHED directories and APPROVED listings
- Include featured slots with proper ordering"
```

---

## Task 10: Refactor Crawler Ingestion Endpoint (Task 51 - Part 9)

**Goal:** Replace crawler listing submission with database insert.

**Files:**
- Modify: `apps/api/src/server.ts` (crawler endpoint)

### Step 1: Replace POST /v1/crawler/listings

Find the crawler ingestion endpoint and replace:

```typescript
app.post('/v1/crawler/listings', requireAuth, async (req, res) => {
  try {
    const { listings } = req.body;

    if (!Array.isArray(listings)) {
      return res.status(400).json({ error: 'listings must be an array' });
    }

    const created = [];
    const errors = [];

    for (const listingData of listings) {
      try {
        const { title, slug, websiteUrl, summary, addresses, categoryIds } = listingData;

        if (!title || !slug) {
          errors.push({ listing: listingData, error: 'title and slug are required' });
          continue;
        }

        const listing = await createListingWithAddress({
          title,
          slug,
          websiteUrl,
          summary,
          addresses: addresses || [],
          categoryIds,
          status: 'PENDING', // Crawler submissions start as PENDING
        });

        created.push(listing);
      } catch (error: any) {
        console.error('[crawler] Failed to create listing:', error);
        errors.push({
          listing: listingData,
          error: error.code === 'P2002' ? 'Duplicate slug' : 'Creation failed',
        });
      }
    }

    res.status(201).json({
      data: {
        created: created.length,
        errors: errors.length,
        listings: created,
        failedListings: errors,
      },
    });
  } catch (error) {
    console.error('[crawler] Failed to process listings:', error);
    res.status(500).json({ error: 'Failed to process listings' });
  }
});
```

### Step 2: Commit crawler endpoint refactor

```bash
git add src/server.ts
git commit -m "refactor: replace crawler ingestion with Prisma database insert

- POST /v1/crawler/listings creates listings in database
- Set status to PENDING for crawler submissions
- Handle batch processing with error tracking
- Return created count and error details"
```

---

## Task 11: Test API Server Database Integration (Task 51 - Part 10)

**Goal:** Verify API server connects to database and can perform CRUD operations.

### Step 1: Start API server and verify database connection

```bash
cd apps/api
npm run dev
```

Expected output should include:
```
[db] Database connection successful
API server listening on http://localhost:3030
```

### Step 2: Test health endpoint

```bash
curl http://localhost:3030/health
```

Expected: `{"status":"ok"}`

### Step 3: Test GET /v1/admin/listings (empty database)

```bash
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings
```

Expected: `{"data":[]}`

### Step 4: Test POST /v1/admin/listings (create test listing)

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

Expected: HTTP 201 with created listing JSON

### Step 5: Verify listing persisted in database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT id, title, slug, status FROM \"Listing\" WHERE slug = 'test-listing-api-integration';"
```

Expected: Row showing the test listing

### Step 6: Test data persistence across API restart

```bash
# Stop API server (Ctrl+C in the terminal running it)
# Wait 5 seconds
# Restart API server
cd apps/api && npm run dev
```

### Step 7: Verify listing still exists after restart

```bash
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings
```

Expected: Array containing the test listing (not empty!)

### Step 8: Test listing update

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

Expected: HTTP 200 with updated listing

### Step 9: Verify update persisted

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT title, status FROM \"Listing\" WHERE id = 1;"
```

Expected: Shows "Updated Test Listing" with status "APPROVED"

### Step 10: Test listing deletion

```bash
curl -X DELETE \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings/1
```

Expected: HTTP 204 (no content)

### Step 11: Verify deletion persisted

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"Listing\" WHERE id = 1;"
```

Expected: Count = 0

### Step 12: Document test results

If all tests passed, create git tag:

```bash
git tag -a v0.1.0-prisma-integration -m "API server now uses Prisma for database persistence"
```

---

## Task 12: Seed Database with Test Data (Task 52 - Part 1)

**Goal:** Populate database with realistic test data.

**Files:**
- Verify: `db/seed.ts`
- Modify: `db/seed.ts` (if needed)

### Step 1: Review existing seed script

```bash
cat db/seed.ts | head -50
```

Check if seed script exists and what data it creates.

### Step 2: Install dependencies in db workspace

```bash
cd db
npm install
```

### Step 3: Generate Prisma Client for seed script

```bash
npx prisma generate --schema=./schema.prisma
```

### Step 4: Run seed script

```bash
npx tsx seed.ts
```

Expected output showing created records:
```
Created 5 categories
Created 3 countries
Created 10 cities
Created 4 directories
Created 15 listings
Seeding complete!
```

### Step 5: Verify categories created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT id, name, slug FROM \"Category\" ORDER BY name;"
```

Expected: At least 5 categories

### Step 6: Verify locations created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) as countries FROM \"Country\";
      SELECT COUNT(*) as states FROM \"StateProvince\";
      SELECT COUNT(*) as cities FROM \"City\";"
```

Expected: Multiple countries, states, cities

### Step 7: Verify directories created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT id, title, slug, subdomain, status FROM \"Directory\";"
```

Expected: At least 4 directories

### Step 8: Verify listings created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) as total_listings FROM \"Listing\";
      SELECT COUNT(*) as pending FROM \"Listing\" WHERE status = 'PENDING';
      SELECT COUNT(*) as approved FROM \"Listing\" WHERE status = 'APPROVED';"
```

Expected: At least 15 listings with mixed statuses

### Step 9: Verify listing addresses created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\";"
```

Expected: At least 30 addresses (2+ per listing)

### Step 10: Verify listing category assignments

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingCategory\";"
```

Expected: Multiple category assignments

### Step 11: Test API returns seeded data

```bash
curl http://localhost:3030/v1/directories
```

Expected: Array of directories with nested data

### Step 12: Commit seed script updates (if modified)

```bash
git add db/seed.ts
git commit -m "feat: seed database with comprehensive test data

- Create 5+ categories
- Create geographic hierarchy (countries, states, cities)
- Create 4+ directories matching static data
- Create 15+ listings with addresses
- Mix of PENDING/APPROVED/REJECTED statuses"
```

---

## Task 13: Enhance Seed Script (Task 52 - Part 2)

**Goal:** Ensure seed script creates all necessary data for testing.

**Files:**
- Modify: `db/seed.ts`

### Step 1: Add comprehensive seed data to seed.ts

If seed script is incomplete, replace/enhance with:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'professional-services' },
      update: {},
      create: {
        name: 'Professional Services',
        slug: 'professional-services',
        description: 'Expert business and professional services',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'jobs' },
      update: {},
      create: {
        name: 'Employment & Jobs',
        slug: 'jobs',
        description: 'Job listings and employment opportunities',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'healthcare' },
      update: {},
      create: {
        name: 'Healthcare',
        slug: 'healthcare',
        description: 'Medical and healthcare services',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'education' },
      update: {},
      create: {
        name: 'Education',
        slug: 'education',
        description: 'Educational services and institutions',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'technology' },
      update: {},
      create: {
        name: 'Technology',
        slug: 'technology',
        description: 'Tech services and solutions',
      },
    }),
  ]);
  console.log(`✓ Created ${categories.length} categories`);

  // Create countries
  const usa = await prisma.country.upsert({
    where: { code: 'US' },
    update: {},
    create: {
      name: 'United States',
      code: 'US',
      slug: 'united-states',
    },
  });
  console.log('✓ Created countries');

  // Create states
  const newYork = await prisma.stateProvince.upsert({
    where: { code: 'NY' },
    update: {},
    create: {
      name: 'New York',
      code: 'NY',
      slug: 'new-york',
      countryId: usa.id,
    },
  });

  const california = await prisma.stateProvince.upsert({
    where: { code: 'CA' },
    update: {},
    create: {
      name: 'California',
      code: 'CA',
      slug: 'california',
      countryId: usa.id,
    },
  });

  const colorado = await prisma.stateProvince.upsert({
    where: { code: 'CO' },
    update: {},
    create: {
      name: 'Colorado',
      code: 'CO',
      slug: 'colorado',
      countryId: usa.id,
    },
  });
  console.log('✓ Created states');

  // Create cities
  const nyc = await prisma.city.upsert({
    where: { slug: 'new-york-city' },
    update: {},
    create: {
      name: 'New York City',
      slug: 'new-york-city',
      stateProvinceId: newYork.id,
    },
  });

  const sf = await prisma.city.upsert({
    where: { slug: 'san-francisco' },
    update: {},
    create: {
      name: 'San Francisco',
      slug: 'san-francisco',
      stateProvinceId: california.id,
    },
  });

  const denver = await prisma.city.upsert({
    where: { slug: 'denver' },
    update: {},
    create: {
      name: 'Denver',
      slug: 'denver',
      stateProvinceId: colorado.id,
    },
  });
  console.log('✓ Created cities');

  // Create locations (city-level locations)
  const nycLocation = await prisma.location.upsert({
    where: { slug: 'new-york-city-ny-us' },
    update: {},
    create: {
      name: 'New York City, NY, US',
      slug: 'new-york-city-ny-us',
      cityId: nyc.id,
    },
  });

  const sfLocation = await prisma.location.upsert({
    where: { slug: 'san-francisco-ca-us' },
    update: {},
    create: {
      name: 'San Francisco, CA, US',
      slug: 'san-francisco-ca-us',
      cityId: sf.id,
    },
  });

  const denverLocation = await prisma.location.upsert({
    where: { slug: 'denver-co-us' },
    update: {},
    create: {
      name: 'Denver, CO, US',
      slug: 'denver-co-us',
      cityId: denver.id,
    },
  });
  console.log('✓ Created locations');

  // Create directories
  const directories = await Promise.all([
    prisma.directory.upsert({
      where: { slug: 'professional-services-new-york-city' },
      update: {},
      create: {
        title: 'NYC Professional Services',
        slug: 'professional-services-new-york-city',
        subdomain: 'pros-nyc',
        subdirectory: 'professional-services/new-york-city',
        status: 'PUBLISHED',
        locationAgnostic: false,
        categoryId: categories[0].id,
        locationId: nycLocation.id,
        heroTitle: 'Trusted Pros in New York City',
        heroSubtitle: 'Find expert professional services in NYC',
        metaTitle: 'NYC Professional Services Directory',
        metaDescription: 'Comprehensive directory of professional services in New York City',
      },
    }),
    prisma.directory.upsert({
      where: { slug: 'jobs-denver' },
      update: {},
      create: {
        title: 'Denver Employment',
        slug: 'jobs-denver',
        subdomain: 'jobs-denver',
        subdirectory: 'jobs/denver',
        status: 'PUBLISHED',
        locationAgnostic: false,
        categoryId: categories[1].id,
        locationId: denverLocation.id,
        heroTitle: 'Jobs in Denver',
        heroSubtitle: 'Find your next career opportunity',
      },
    }),
    prisma.directory.upsert({
      where: { slug: 'jobs-san-francisco' },
      update: {},
      create: {
        title: 'San Francisco Jobs',
        slug: 'jobs-san-francisco',
        subdomain: 'jobs-sf',
        subdirectory: 'jobs/san-francisco',
        status: 'PUBLISHED',
        locationAgnostic: false,
        categoryId: categories[1].id,
        locationId: sfLocation.id,
        heroTitle: 'SF Bay Area Careers',
      },
    }),
    prisma.directory.upsert({
      where: { slug: 'healthcare-services' },
      update: {},
      create: {
        title: 'Healthcare Services',
        slug: 'healthcare-services',
        subdomain: 'healthcare',
        subdirectory: 'healthcare',
        status: 'PUBLISHED',
        locationAgnostic: true,
        categoryId: categories[2].id,
        heroTitle: 'Healthcare Providers',
      },
    }),
  ]);
  console.log(`✓ Created ${directories.length} directories`);

  // Create sample listings
  const listing1 = await prisma.listing.create({
    data: {
      title: 'Acme Professional Services',
      slug: 'acme-professional-services',
      status: 'APPROVED',
      websiteUrl: 'https://acmepros.example.com',
      summary: 'Expert consulting and professional services for businesses',
      contactEmail: 'info@acmepros.example.com',
      contactPhone: '+1-555-0100',
      directoryId: directories[0].id,
      addresses: {
        create: [
          {
            addressLine1: '123 Broadway',
            addressLine2: 'Suite 500',
            city: 'New York',
            region: 'NY',
            postalCode: '10001',
            country: 'US',
          },
          {
            addressLine1: '456 Fifth Avenue',
            city: 'New York',
            region: 'NY',
            postalCode: '10002',
            country: 'US',
          },
        ],
      },
      categories: {
        create: [
          { categoryId: categories[0].id },
          { categoryId: categories[4].id },
        ],
      },
    },
  });

  const listing2 = await prisma.listing.create({
    data: {
      title: 'Denver Tech Solutions',
      slug: 'denver-tech-solutions',
      status: 'APPROVED',
      websiteUrl: 'https://denvertech.example.com',
      summary: 'IT support and managed services for Denver businesses',
      contactEmail: 'contact@denvertech.example.com',
      contactPhone: '+1-303-555-9876',
      directoryId: directories[1].id,
      addresses: {
        create: [
          {
            addressLine1: '789 Tech Blvd',
            city: 'Denver',
            region: 'CO',
            postalCode: '80202',
            country: 'US',
          },
        ],
      },
      categories: {
        create: [{ categoryId: categories[4].id }],
      },
    },
  });

  const listing3 = await prisma.listing.create({
    data: {
      title: 'SF Bay Recruiters',
      slug: 'sf-bay-recruiters',
      status: 'PENDING',
      websiteUrl: 'https://sfrecruit.example.com',
      summary: 'Executive recruiting services',
      contactEmail: 'jobs@sfrecruit.example.com',
      directoryId: directories[2].id,
      addresses: {
        create: [
          {
            addressLine1: '100 Market Street',
            city: 'San Francisco',
            region: 'CA',
            postalCode: '94102',
            country: 'US',
          },
        ],
      },
      categories: {
        create: [{ categoryId: categories[1].id }],
      },
    },
  });

  // Create more listings with varied statuses
  for (let i = 4; i <= 15; i++) {
    const statuses = ['PENDING', 'APPROVED', 'REJECTED'];
    const status = statuses[i % 3];
    const dirIndex = i % directories.length;

    await prisma.listing.create({
      data: {
        title: `Sample Business ${i}`,
        slug: `sample-business-${i}`,
        status,
        websiteUrl: `https://sample${i}.example.com`,
        summary: `Sample listing ${i} for testing`,
        contactEmail: `contact${i}@example.com`,
        contactPhone: `+1-555-${String(i).padStart(4, '0')}`,
        directoryId: directories[dirIndex].id,
        addresses: {
          create: [
            {
              addressLine1: `${i * 100} Main Street`,
              city: ['New York', 'Denver', 'San Francisco'][dirIndex % 3],
              region: ['NY', 'CO', 'CA'][dirIndex % 3],
              postalCode: `${10000 + i}`,
              country: 'US',
            },
          ],
        },
        categories: {
          create: [
            { categoryId: categories[i % categories.length].id },
          ],
        },
      },
    });
  }
  console.log('✓ Created 15 listings with addresses');

  console.log('✓ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Step 2: Run enhanced seed script

```bash
cd db
npx tsx seed.ts
```

### Step 3: Verify comprehensive data created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT
        (SELECT COUNT(*) FROM \"Category\") as categories,
        (SELECT COUNT(*) FROM \"Country\") as countries,
        (SELECT COUNT(*) FROM \"StateProvince\") as states,
        (SELECT COUNT(*) FROM \"City\") as cities,
        (SELECT COUNT(*) FROM \"Location\") as locations,
        (SELECT COUNT(*) FROM \"Directory\") as directories,
        (SELECT COUNT(*) FROM \"Listing\") as listings,
        (SELECT COUNT(*) FROM \"ListingAddress\") as addresses;"
```

Expected: All counts > 0

### Step 4: Commit enhanced seed script

```bash
git add db/seed.ts
git commit -m "feat: enhance seed script with comprehensive test data

- Use upsert to make seed idempotent
- Create full geographic hierarchy
- Create 15 listings with varied statuses
- Include multiple addresses per listing
- Add category assignments"
```

---

## Task 14: Start All Services for Integration Testing (Task 53 - Part 1)

**Goal:** Verify all services can start and communicate.

### Step 1: Start database

```bash
docker compose up -d db
```

### Step 2: Verify database running

```bash
docker compose ps
```

Expected: db service "Up"

### Step 3: Start API server (Terminal 1)

```bash
cd apps/api
npm run dev
```

Wait for:
```
[db] Database connection successful
API server listening on http://localhost:3030
```

### Step 4: Test API health (Terminal 2)

```bash
curl http://localhost:3030/health
```

Expected: `{"status":"ok"}`

### Step 5: Start admin UI (Terminal 3)

```bash
cd apps/admin
npm run dev
```

Wait for:
```
Admin app listening at http://localhost:4000
```

### Step 6: Verify admin UI health check passes

Check admin server logs for:
```
[admin] Admin API health check passed
```

### Step 7: Start web frontend (Terminal 4)

```bash
cd apps/web
npm run dev
```

Wait for server to start on port 4321 (or configured port).

### Step 8: Test admin UI loads

Open browser: http://localhost:4000

Expected: Admin UI loads without errors

### Step 9: Check browser console

Open DevTools → Console

Expected: No errors, no 401/403 responses

### Step 10: Test web frontend loads

Open browser: http://localhost:4321

Expected: Homepage loads

### Step 11: Document service startup order

Create startup checklist (for reference):
1. Database (docker compose)
2. API server (wait for db connection)
3. Admin UI (wait for API health)
4. Web frontend (optional, for testing)

---

## Task 15: Integration Test - Admin Listings CRUD (Task 53 - Part 2)

**Goal:** Verify admin UI can create, read, update, delete listings.

**Prerequisites:** All services running from Task 14

### Step 1: Navigate to listings page

Open browser: http://localhost:4000/listings

### Step 2: Verify existing listings display

Expected: Page shows listings from seed data (15+ listings)

### Step 3: Click "Add New Listing" or create form

Fill out form:
- Title: "Integration Test Listing"
- Slug: "integration-test-listing"
- Website: "https://integrationtest.example.com"
- Phone: "+1-555-TEST"
- Email: "test@integration.example.com"
- Summary: "This listing tests admin UI integration"
- Status: PENDING

### Step 4: Add first address

- Address Line 1: "100 Integration Blvd"
- City: "Test City"
- Region: "TC"
- Postal Code: "99999"
- Country: "US"

### Step 5: Add second address

- Address Line 1: "200 Testing Ave"
- City: "Test City"
- Region: "TC"
- Postal Code: "99998"
- Country: "US"

### Step 6: Assign categories

Select 2 categories (e.g., Professional Services, Technology)

### Step 7: Submit form

Click "Save" or "Create Listing"

### Step 8: Verify success message

Expected: "Listing created successfully" or similar

### Step 9: Verify listing appears in list

Scroll to top of listings page

Expected: "Integration Test Listing" appears

### Step 10: Note the listing ID

Check URL or listing card for ID (e.g., id: 16)

### Step 11: Verify in database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT id, title, slug, status FROM \"Listing\" WHERE slug = 'integration-test-listing';"
```

Expected: Row with listing data

### Step 12: Verify addresses in database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT * FROM \"ListingAddress\" WHERE \"listingId\" = 16;"
```

Expected: 2 addresses

---

## Task 16: Integration Test - Data Persistence (Task 53 - Part 3)

**Goal:** Verify data survives API server restart.

**Prerequisites:** Integration Test Listing created from Task 15

### Step 1: Note current listing count in admin UI

Count listings on page: should be 16 (15 seed + 1 test)

### Step 2: Stop API server

In Terminal 1 (where API is running): Ctrl+C

### Step 3: Wait 5 seconds

```bash
sleep 5
```

### Step 4: Restart API server

```bash
cd apps/api
npm run dev
```

Wait for "Database connection successful"

### Step 5: Refresh admin UI listings page

In browser: Press F5 or Refresh button

### Step 6: Verify listing count unchanged

Expected: Still 16 listings

### Step 7: Verify Integration Test Listing still exists

Scroll to find "Integration Test Listing"

Expected: Listing present with all data intact

### Step 8: Verify via API endpoint

```bash
curl -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     http://localhost:3030/v1/admin/listings | grep "integration-test-listing"
```

Expected: Listing appears in JSON response

### Step 9: Verify addresses persisted

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\" WHERE \"listingId\" = 16;"
```

Expected: Count = 2

### Step 10: Document persistence test success

Create note: "✓ Data persists across API restarts - database integration confirmed"

---

## Task 17: Integration Test - Update and Delete (Task 53 - Part 4)

**Goal:** Verify listing updates and deletions work correctly.

### Step 1: Click edit on Integration Test Listing

In admin UI, find "Integration Test Listing" and click Edit button

### Step 2: Update title

Change title to: "Updated Integration Test"

### Step 3: Update status

Change status from PENDING to APPROVED

### Step 4: Add third address

- Address Line 1: "300 Update Street"
- City: "Test City"
- Region: "TC"
- Postal Code: "99997"
- Country: "US"

### Step 5: Save changes

Click "Save" or "Update Listing"

### Step 6: Verify success message

Expected: "Listing updated successfully"

### Step 7: Verify title changed in UI

Expected: "Updated Integration Test" appears in listing list

### Step 8: Verify in database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT title, status FROM \"Listing\" WHERE id = 16;"
```

Expected: title = "Updated Integration Test", status = "APPROVED"

### Step 9: Verify third address added

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\" WHERE \"listingId\" = 16;"
```

Expected: Count = 3

### Step 10: Create disposable test listing

Create another listing: "Delete Me Test"

Note its ID (e.g., 17)

### Step 11: Delete the disposable listing

Click Delete button on "Delete Me Test" listing

Confirm deletion

### Step 12: Verify listing removed from UI

Expected: "Delete Me Test" no longer appears

### Step 13: Verify deletion in database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"Listing\" WHERE id = 17;"
```

Expected: Count = 0

### Step 14: Verify addresses cascade-deleted

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"ListingAddress\" WHERE \"listingId\" = 17;"
```

Expected: Count = 0 (addresses auto-deleted)

---

## Task 18: Integration Test - Concurrent Operations (Task 53 - Part 5)

**Goal:** Verify multiple users can work concurrently.

### Step 1: Open admin UI in second browser tab

Tab 1: http://localhost:4000/listings
Tab 2: http://localhost:4000/listings (new tab)

### Step 2: Create listing in Tab 1

Title: "Concurrent Test A"
Slug: "concurrent-test-a"
Click Save

### Step 3: Immediately switch to Tab 2

Do NOT refresh yet

### Step 4: Note listing count in Tab 2

Count listings on page

### Step 5: Refresh Tab 2

Press F5

### Step 6: Verify new listing appears

Expected: "Concurrent Test A" now visible in Tab 2

### Step 7: Update listing in Tab 1

Edit "Concurrent Test A"
Change title to: "Concurrent Test A - Modified"
Save

### Step 8: Switch to Tab 2 and refresh

Press F5 in Tab 2

### Step 9: Verify update appears

Expected: "Concurrent Test A - Modified" shows in Tab 2

### Step 10: Document concurrent access success

Note: "✓ Multiple users can work concurrently - changes sync correctly"

---

## Task 19: Prepare Test Data for Import Script (Task 54 - Part 1)

**Goal:** Create sample data files for testing text_import.py.

**Files:**
- Create: `test-data/sample-listings.html`
- Create: `test-data/sample-listings.txt`
- Create: `test-data/sample-listings.csv`

### Step 1: Create test-data directory

```bash
mkdir -p test-data
```

### Step 2: Create sample HTML file

Create `test-data/sample-listings.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sample Business Listings</title>
</head>
<body>
    <article data-listing>
        <h2 class="listing-title">Acme Professional Services</h2>
        <p class="listing-description">Expert consulting for small businesses. We provide strategic planning, financial analysis, and operational improvements.</p>
        <a href="https://acmepros.example.com" class="website">Visit Website</a>
        <p class="contact">Phone: (555) 123-4567</p>
        <p class="contact">Email: info@acmepros.example.com</p>
        <p class="address">123 Main St, New York, NY 10001</p>
    </article>

    <article data-listing>
        <h2 class="listing-title">Denver Tech Solutions</h2>
        <p class="listing-description">IT support and managed services for Denver-area businesses. 24/7 support available.</p>
        <a href="https://denvertech.example.com">Visit Website</a>
        <p class="contact">Phone: (303) 555-9876</p>
        <p class="contact">Email: contact@denvertech.example.com</p>
        <p class="address">456 Tech Blvd, Denver, CO 80202</p>
    </article>

    <article data-listing>
        <h2 class="listing-title">Bay Area Recruiters</h2>
        <p class="listing-description">Executive recruiting and talent acquisition for tech companies.</p>
        <a href="https://bayarearecruit.example.com">Visit Website</a>
        <p class="contact">Email: jobs@bayarearecruit.example.com</p>
        <p class="address">789 Market Street, San Francisco, CA 94102</p>
    </article>

    <article data-listing>
        <h2 class="listing-title">HealthFirst Medical</h2>
        <p class="listing-description">Primary care and preventive medicine.</p>
        <a href="https://healthfirst.example.com">Visit Website</a>
        <p class="contact">Phone: (555) 234-5678</p>
        <p class="address">100 Health Plaza, New York, NY 10003</p>
    </article>

    <article data-listing>
        <h3>EduTech Academy</h3>
        <p>Online learning platform for professional development.</p>
        <a href="https://edutech.example.com">Website</a>
        <p>Contact: support@edutech.example.com</p>
    </article>
</body>
</html>
```

### Step 3: Create sample plain text file

Create `test-data/sample-listings.txt`:

```
Acme Professional Services - Expert consulting for small businesses.
Located at 123 Main St, New York, NY 10001. Call (555) 123-4567.
Website: https://acmepros.example.com
Email: info@acmepros.example.com

Denver Tech Solutions provides IT support and managed services.
Contact: contact@denvertech.example.com | Phone: (303) 555-9876
Office: 456 Tech Blvd, Denver, CO 80202
Visit us at https://denvertech.example.com

Bay Area Recruiters
Executive recruiting and talent acquisition for tech companies
Based in San Francisco at 789 Market Street, CA 94102
Email jobs@bayarearecruit.example.com
https://bayarearecruit.example.com

HealthFirst Medical - Primary care clinic in NYC
100 Health Plaza, New York, NY 10003
Phone: (555) 234-5678
https://healthfirst.example.com

EduTech Academy offers online professional development courses
Email: support@edutech.example.com
Website: https://edutech.example.com
```

### Step 4: Create sample CSV file

Create `test-data/sample-listings.csv`:

```csv
title,website,phone,email,description,address,city,state,zip
Acme Professional Services,https://acmepros.example.com,(555) 123-4567,info@acmepros.example.com,Expert consulting for small businesses,123 Main St,New York,NY,10001
Denver Tech Solutions,https://denvertech.example.com,(303) 555-9876,contact@denvertech.example.com,IT support and managed services,456 Tech Blvd,Denver,CO,80202
Bay Area Recruiters,https://bayarearecruit.example.com,,jobs@bayarearecruit.example.com,Executive recruiting and talent acquisition,789 Market Street,San Francisco,CA,94102
HealthFirst Medical,https://healthfirst.example.com,(555) 234-5678,,Primary care and preventive medicine,100 Health Plaza,New York,NY,10003
EduTech Academy,https://edutech.example.com,,support@edutech.example.com,Online learning platform,,,
Global Logistics Inc,https://globallogistics.example.com,(555) 345-6789,info@globallogistics.example.com,"Freight and shipping services, worldwide",200 Cargo Way,Denver,CO,80203
```

### Step 5: Verify test files created

```bash
ls -lh test-data/
```

Expected: 3 files (sample-listings.html, .txt, .csv)

### Step 6: Commit test data files

```bash
git add test-data/
git commit -m "feat: add test data files for import script testing

- sample-listings.html for HTML extraction mode
- sample-listings.txt for LLM extraction mode
- sample-listings.csv for CSV import mode"
```

---

## Task 20: Test HTML Import Mode (Task 54 - Part 2)

**Goal:** Verify text_import.py can extract listings from HTML.

**Prerequisites:** Test data created from Task 19

### Step 1: Verify Python dependencies installed

```bash
cd apps/crawler
pip list | grep -E "(beautifulsoup4|requests|jinja2)"
```

Expected: All three packages listed

### Step 2: Run HTML extraction

```bash
python text_import.py \
  --input ../../test-data/sample-listings.html \
  --mode html \
  --output ../../test-output-html.json
```

### Step 3: Verify no errors during execution

Expected: Script completes without exceptions

### Step 4: Verify output file created

```bash
ls -lh ../../test-output-html.json
```

Expected: File exists

### Step 5: Review extracted JSON structure

```bash
cat ../../test-output-html.json | head -30
```

Expected: JSON with "listings" array

### Step 6: Validate JSON is well-formed

```bash
python -m json.tool ../../test-output-html.json > /dev/null && echo "Valid JSON"
```

Expected: "Valid JSON"

### Step 7: Count extracted listings

```bash
cat ../../test-output-html.json | python -c "import sys, json; print(len(json.load(sys.stdin)['listings']))"
```

Expected: 5 (matching HTML file)

### Step 8: Verify listing fields extracted

```bash
cat ../../test-output-html.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; print(f\"Title: {listing.get('title')}\nWebsite: {listing.get('websiteUrl')}\nSummary: {listing.get('summary')}\")"
```

Expected: Shows title, website, summary

### Step 9: Document HTML extraction success

Note: "✓ HTML extraction mode works - extracted 5 listings"

---

## Task 21: Test LLM Import Mode (Task 54 - Part 3)

**Goal:** Verify text_import.py can extract listings using LLM.

**Prerequisites:** OPENROUTER_API_KEY in .env

### Step 1: Verify LLM API key available

```bash
grep OPENROUTER_API_KEY .env
```

Expected: Key present

### Step 2: Run LLM extraction

```bash
cd apps/crawler
python text_import.py \
  --input ../../test-data/sample-listings.txt \
  --mode llm \
  --llm-provider openrouter \
  --llm-model anthropic/claude-3.5-sonnet \
  --output ../../test-output-llm.json
```

### Step 3: Verify LLM API called successfully

Check console output for API request log

Expected: No authentication errors

### Step 4: Verify output file created

```bash
ls -lh ../../test-output-llm.json
```

Expected: File exists

### Step 5: Validate JSON is well-formed

```bash
python -m json.tool ../../test-output-llm.json > /dev/null && echo "Valid JSON"
```

Expected: "Valid JSON"

### Step 6: Count extracted listings

```bash
cat ../../test-output-llm.json | python -c "import sys, json; print(len(json.load(sys.stdin)['listings']))"
```

Expected: 5 (from plain text)

### Step 7: Verify LLM extracted structured data

```bash
cat ../../test-output-llm.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; print(json.dumps(listing, indent=2))" | head -20
```

Expected: Structured JSON with title, websiteUrl, contactPhone, location fields

### Step 8: Compare LLM vs HTML extraction accuracy

Review both output files side-by-side

Note: LLM may extract different fields or structure location data differently

### Step 9: Document LLM extraction success

Note: "✓ LLM extraction mode works - extracted 5 listings from unstructured text"

---

## Task 22: Test CSV Import Mode (Task 54 - Part 4)

**Goal:** Verify text_import.py can import from CSV files.

### Step 1: Run CSV import

```bash
cd apps/crawler
python text_import.py \
  --input ../../test-data/sample-listings.csv \
  --mode csv \
  --output ../../test-output-csv.json
```

### Step 2: Verify no errors

Expected: Script completes successfully

### Step 3: Verify output file created

```bash
ls -lh ../../test-output-csv.json
```

Expected: File exists

### Step 4: Validate JSON

```bash
python -m json.tool ../../test-output-csv.json > /dev/null && echo "Valid JSON"
```

Expected: "Valid JSON"

### Step 5: Count extracted listings

```bash
cat ../../test-output-csv.json | python -c "import sys, json; print(len(json.load(sys.stdin)['listings']))"
```

Expected: 6 (from CSV file)

### Step 6: Verify column mapping

```bash
cat ../../test-output-csv.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; print(f\"Title: {listing.get('title')}\nWebsite: {listing.get('websiteUrl')}\nPhone: {listing.get('contactPhone')}\nEmail: {listing.get('contactEmail')}\")"
```

Expected: All fields populated from CSV columns

### Step 7: Verify blank field handling

Check listing without phone number (Bay Area Recruiters):

```bash
cat ../../test-output-csv.json | python -c "import sys, json; listing = [l for l in json.load(sys.stdin)['listings'] if 'Bay Area' in l.get('title', '')][0]; print(f\"Phone: {listing.get('contactPhone')}\")"
```

Expected: Phone is null or empty (not "NaN" or error)

### Step 8: Verify location parsing

```bash
cat ../../test-output-csv.json | python -c "import sys, json; listing = json.load(sys.stdin)['listings'][0]; loc = listing.get('location', {}); print(f\"City: {loc.get('city')}\nRegion: {loc.get('region')}\nPostal: {loc.get('postalCode')}\")"
```

Expected: Location fields extracted from address, city, state, zip columns

### Step 9: Document CSV import success

Note: "✓ CSV import mode works - imported 6 listings with proper column mapping"

---

## Task 23: Test API Ingestion Endpoint (Task 54 - Part 5)

**Goal:** Verify extracted listings can be POSTed to API.

**Prerequisites:** API server running, test output files created

### Step 1: Verify API server running

```bash
curl http://localhost:3030/health
```

Expected: `{"status":"ok"}`

### Step 2: POST HTML-extracted listings to API

```bash
curl -X POST \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     -H "Content-Type: application/json" \
     -d @test-output-html.json \
     http://localhost:3030/v1/crawler/listings
```

### Step 3: Verify 201 Created response

Expected: HTTP 201 with JSON response showing created count

### Step 4: Check API logs

Look for processing messages in API server terminal

Expected: "[crawler] Created X listings"

### Step 5: Verify listings in database

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"Listing\" WHERE title LIKE '%Acme Professional%' OR title LIKE '%Denver Tech%';"
```

Expected: Count > 0 (listings created)

### Step 6: Verify listing status set to PENDING

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT title, status FROM \"Listing\" WHERE title LIKE '%Acme Professional%' LIMIT 1;"
```

Expected: status = 'PENDING'

### Step 7: Verify in admin UI

Open: http://localhost:4000/listings

Expected: New listings from import appear

### Step 8: Test duplicate handling

POST same file again:

```bash
curl -X POST \
     -H "Authorization: Bearer VdgeXgbnfw-F5W6Kl5hv3Fz_6Ku1NQ4vA9R4QHyt0VA" \
     -H "Content-Type: application/json" \
     -d @test-output-html.json \
     http://localhost:3030/v1/crawler/listings
```

Expected: Response shows errors for duplicate slugs

### Step 9: Verify duplicate not created

```bash
psql "postgresql://postgres:password@localhost:5432/mega_directory" \
  -c "SELECT COUNT(*) FROM \"Listing\" WHERE slug = 'acme-professional-services';"
```

Expected: Count = 1 (not 2)

### Step 10: Document API ingestion success

Note: "✓ API ingestion endpoint works - creates listings with PENDING status, handles duplicates"

---

## Task 24: Create Import Documentation (Task 54 - Part 6)

**Goal:** Document text_import.py usage for future imports.

**Files:**
- Create: `apps/crawler/IMPORT_GUIDE.md`
- Modify: `README.md`

### Step 1: Create IMPORT_GUIDE.md

Create `apps/crawler/IMPORT_GUIDE.md`:

```markdown
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
```

### Step 2: Commit IMPORT_GUIDE.md

```bash
git add apps/crawler/IMPORT_GUIDE.md
git commit -m "docs: add comprehensive import guide for text_import.py

- Document all three extraction modes (HTML, LLM, CSV)
- Include usage examples and command-line options
- Add troubleshooting section
- Document end-to-end workflow"
```

### Step 3: Update main README.md

Add section to `README.md`:

```markdown
## Importing Listings

The crawler includes a flexible import script for adding listings from various sources.

### Import Modes

- **HTML Mode** - Parse scraped web pages
- **LLM Mode** - Extract from plain text using AI
- **CSV Mode** - Import from spreadsheets

See [apps/crawler/IMPORT_GUIDE.md](apps/crawler/IMPORT_GUIDE.md) for detailed documentation.

### Quick Start

```bash
# HTML extraction
python apps/crawler/text_import.py \
  --input data.html \
  --mode html \
  --output extracted.json

# Post to API
curl -X POST \
     -H "Authorization: Bearer $CRAWLER_BEARER_TOKEN" \
     -H "Content-Type: application/json" \
     -d @extracted.json \
     http://localhost:3030/v1/crawler/listings
```
```

### Step 4: Commit README update

```bash
git add README.md
git commit -m "docs: add import section to README with link to IMPORT_GUIDE"
```

---

## Task 25: Final Integration Verification (Task 53 - Part 6)

**Goal:** Run comprehensive end-to-end test to verify all systems working.

### Step 1: Create comprehensive test checklist

Create file `.integration-checklist.md`:

```markdown
# Integration Test Checklist

## Service Startup
- [ ] Database container running
- [ ] API server starts without errors
- [ ] API logs show "Database connection successful"
- [ ] Admin UI starts without errors
- [ ] Admin UI logs show "Admin API health check passed"

## Authentication
- [ ] /health endpoint returns 200
- [ ] Requests with valid token succeed
- [ ] Requests without token return 401
- [ ] Requests with invalid token return 403

## Listings CRUD
- [ ] GET /v1/admin/listings returns array
- [ ] POST /v1/admin/listings creates new record
- [ ] PUT /v1/admin/listings/:id updates record
- [ ] DELETE /v1/admin/listings/:id removes record
- [ ] Listings include nested addresses
- [ ] Listings include nested categories

## Data Persistence
- [ ] Created listings survive API restart
- [ ] Updated listings persist changes
- [ ] Deleted listings stay deleted
- [ ] Relationships (addresses, categories) persist

## Admin UI Integration
- [ ] Listings page loads and displays data
- [ ] Create listing form works
- [ ] Edit listing form works
- [ ] Delete listing button works
- [ ] Success/error messages display correctly
- [ ] Browser console shows no errors

## Database Verification
- [ ] psql queries confirm data matches API responses
- [ ] Foreign key relationships intact
- [ ] Unique constraints enforced
- [ ] Cascade deletes work correctly

## Import Script
- [ ] HTML extraction mode works
- [ ] LLM extraction mode works
- [ ] CSV import mode works
- [ ] API ingestion endpoint accepts extracted data
- [ ] Imported listings appear in admin UI

## Public Endpoints
- [ ] GET /v1/directories returns published directories
- [ ] GET /v1/directories/:slug returns directory with listings
- [ ] Only APPROVED listings appear in public directories
```

### Step 2: Run through entire checklist

Systematically test each item, checking boxes as you go.

### Step 3: Document any failures

If any items fail, note the issue and resolution.

### Step 4: Verify all 30+ items pass

Expected: All checkboxes checked

### Step 5: Create final verification commit

```bash
git add .integration-checklist.md
git commit -m "test: comprehensive integration test checklist - all passing

All 30+ integration tests verified:
- Service startup and health checks
- Authentication and authorization
- CRUD operations on all resources
- Data persistence across restarts
- Admin UI functionality
- Import script all three modes
- Public endpoint filtering"
```

### Step 6: Tag release

```bash
git tag -a v1.0.0-mvp -m "MVP complete with database persistence

All critical issues resolved:
- Environment variables fixed (admin auth works)
- Prisma integrated (data persists)
- Database seeded with test data
- All integration tests passing
- Import functionality tested and documented"
```

---

## Execution Complete

**All tasks completed!** Here's what was accomplished:

### Fixed Issues

1. ✅ **Admin Authentication** - Fixed ADMIN_API_TOKEN bug
2. ✅ **API-Database Integration** - Replaced in-memory storage with Prisma
3. ✅ **Data Persistence** - All data now survives API restarts
4. ✅ **Import Functionality** - Tested HTML, LLM, and CSV import modes

### Created/Modified Files

**Configuration:**
- `.env` - Fixed token, added API URLs
- `.env.example` - Updated template

**API Server:**
- `apps/api/src/db.ts` - New database service module
- `apps/api/src/types.ts` - New type definitions
- `apps/api/src/server.ts` - Refactored with Prisma

**Database:**
- `db/seed.ts` - Enhanced seed script

**Documentation:**
- `README.md` - Added environment variables and import sections
- `apps/crawler/IMPORT_GUIDE.md` - Comprehensive import guide
- `.integration-checklist.md` - Test verification checklist

**Test Data:**
- `test-data/sample-listings.html`
- `test-data/sample-listings.txt`
- `test-data/sample-listings.csv`

### Verification

All integration tests passing:
- ✅ 30+ integration test items verified
- ✅ Data persists across API restarts
- ✅ Admin UI fully functional
- ✅ Import script working in all modes
- ✅ Public endpoints filtering correctly

### Git History

Clean commit history with:
- Feature commits for each major change
- Documentation commits
- Test verification commits
- Tagged release: `v1.0.0-mvp`

---

## Next Steps (Optional Enhancements)

While the MVP is complete, consider these improvements:

1. **Automated Tests**
   - Write Jest/Vitest integration tests
   - Add CI/CD pipeline
   - Test coverage reporting

2. **Error Handling**
   - Better error messages in admin UI
   - Validation feedback
   - Retry logic for API calls

3. **Performance**
   - Add database indexes
   - Implement caching
   - Optimize N+1 queries

4. **Features**
   - Bulk operations in admin UI
   - Search and filtering
   - Export functionality

But for now: **🎉 MVP is production-ready!**
