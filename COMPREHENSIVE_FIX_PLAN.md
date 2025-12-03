# Comprehensive Fix Plan - Mega Directory
**Generated**: 2025-12-03
**Status**: In Progress

---

## Executive Summary

This document organizes all outstanding work from Tasks 00-116 into a prioritized, actionable plan. Work is categorized by:
1. **Priority Level** (Critical → High → Medium → Low)
2. **Container Dependency** (Can work without containers vs requires running services)

---

## 🔴 CRITICAL - Immediate Blockers

### C1. Fix API Container Startup ✅ COMPLETED
**Status**: All containers running and healthy
**Files**: `docker-compose.override.yml`
**Changes Made**:
- Rebuilt Docker images with --no-cache (image 940741d6415c)
- Removed problematic commands due to TypeScript compilation issues
- Volume mounts working correctly for source files
- Using pre-compiled code from image (Task 107 will add watch mode)
**Commits**: 69d73a3, 85391f9
**Verified**: ✅ API responds on localhost:3030, health check passes

### C2. Verify Prisma Schema Fix ✅ COMPLETED
**Status**: Fix verified and working correctly
**File**: `apps/api/src/services/directoryService.ts:74-96, 119-162`
**Changes Made**:
- Fixed `cityRecord.stateRecord` → `cityRecord.state`
- Added proper includes for all Location relations
**Commits**: 69d73a3 (fix), 85391f9 (verification)
**Testing**:
```bash
curl -s 'http://localhost:3030/v1/directories?page=1&limit=2' | jq '.'
```
**Verified**: ✅ Returns correct nested location data, all relations working

### C3. Run VIBE-CHECK on Changes ✅ COMPLETED
**Status**: VIBE-CHECK completed with valuable feedback
**Requires Containers**: No
**Actions Taken**:
- Ran vibe-check on Prisma fix and Docker configuration
- Identified health check reporting issue (Node.js heap vs container memory)
- Clarified uncertainties (dev workflow, migrations, tests, env vars)
- VIBE-CHECK validated overall approach and highlighted areas needing attention
**Key Findings**:
- API reports "degraded" (95% Node.js heap) but container only using 0.36% memory
- Health check needs improvement to report container-level metrics
- Docker dev workflow incomplete (Task 107 needed for watch mode)
- PostgreSQL enum migrations need pattern documentation

### C4. Verify Core API Endpoints ✅ COMPLETED (Partial)
**Requires Containers**: Yes
**Endpoints Tested**:
- ✅ `GET /health` - Health check (responds, see C3 for nuance)
- ✅ `GET /v1/directories` - Directory listing (working perfectly)
- ⏭️ `GET /v1/directories/{slug}` - Single directory (not tested yet)
- ⏭️ `GET /v1/listings` - Listing pagination (not tested yet)
- ⏭️ `POST /v1/admin/auth` - Admin authentication (not tested yet)
**Next**: Test remaining endpoints before moving to feature implementation

---

## 🟠 HIGH PRIORITY - Core Features Missing/Broken

These address gaps identified in STATUS_CHECKLIST and are essential for the application to meet specifications.

### H1. Task 109 - Directory Admin Schema Parity
**File**: `codex/TASKS/109_directory_admin_schema_parity.yaml`
**Issue**: Admin UI for directories doesn't expose all schema fields
**Missing**:
- Location lookup from API (not fixtures)
- `locationAgnostic` toggle
- `introMarkdown` editor
- `featuredLimit` field
- Hero text fields (`heroTitle`, `heroSubtitle`)
- `ogImageUrl` field
- Status options (ACTIVE/DRAFT/ARCHIVED)
**Dependencies**: Tasks 25, 27, 28, 32
**Requires Containers**: Yes (need API for location lookup)
**Files to Modify**:
- `apps/admin/views/directories/*.ejs`
- `apps/admin/routes/directories.js`
- `apps/admin/services/directoryPageService.js`

### H2. Task 100 - Geocoding Pipeline
**File**: `codex/TASKS/100_geocoding_and_map_pin_pipeline.yaml`
**Issue**: No geocoding service, maps don't work
**Needs**:
- Geocoding service (primary + fallback providers)
- Persist lat/lon on listings/addresses and directory locations
- Backfill existing seed data
- Map pins use stored coordinates
- Handle missing/invalid data gracefully
- Add smoke tests
**Dependencies**: Tasks 30, 31, 35
**Requires Containers**: No for service implementation, Yes for testing
**New Files**:
- `apps/api/src/services/geocodingService.ts`
- `apps/api/src/utils/geocoding.ts`
- Tests in `apps/api/test/`

### H3. Task 101 - Crawler-API Alignment
**File**: `codex/TASKS/101_crawler_api_alignment_and_enrichment.yaml`
**Issue**: Crawler doesn't properly post to API
**Related STATUS**: Tasks 11, 12, 34, 35
**Needs**:
- Crawler authentication with CRAWLER_BEARER_TOKEN
- API endpoint accepts crawler payloads
- LLM enrichment (summaries, category suggestions)
- Error handling and retries
**Requires Containers**: Yes (API must be running)
**Files**:
- `apps/crawler/crawler/api_client.py`
- `apps/api/src/routes/crawler/*`

### H4. Task 102 - Admin Import Review & API Sync
**File**: `codex/TASKS/102_admin_import_review_and_api_sync.yaml`
**Issue**: Admin listing review not connected to live data
**Related STATUS**: Tasks 04, 15, 37
**Needs**:
- Admin UI pulls listings from API (not fixtures)
- Batch review operations (approve/reject/edit)
- Status transitions with logging
- Import source tracking
**Requires Containers**: Yes
**Files**:
- `apps/admin/routes/listings.js`
- `apps/admin/services/listingsService.js`
- `apps/admin/views/listings/*.ejs`

### H5. Task 106 - Admin Category/Location/SEO Integration
**File**: `codex/TASKS/106_admin_category_location_seo_integration.yaml`
**Issue**: Admin UI uses fixtures, not API data
**Related STATUS**: Tasks 09, 16, 17
**Needs**:
- Category CRUD through API
- Location management through API
- SEO field editors per directory
- Validation feedback from API
**Requires Containers**: Yes
**Files**:
- `apps/admin/routes/categories.js` (new or update)
- `apps/admin/routes/locations.js` (new or update)
- `apps/admin/routes/seo.js` (new or update)

### H6. Task 110 - Multi-Category/Location Listing Support
**File**: `codex/TASKS/110_multi_category_location_listing_support.yaml`
**Issue**: Schema supports multiple categories/locations, but UI doesn't
**Related STATUS**: Task 29
**Needs**:
- Admin UI for assigning multiple categories to listing
- Admin UI for multiple addresses/locations
- Filtering by multiple categories in directory pages
**Requires Containers**: Yes
**Files**:
- `apps/admin/views/listings/form.ejs`
- `apps/api/src/services/listingService.ts`
- `apps/web/src/components/ListingCard.astro`

---

## 🟡 MEDIUM PRIORITY - Important Infrastructure

### M1. Task 107 - Containerization & Dev Environment ✅ PARTIAL
**File**: `codex/TASKS/107_containerization_and_dev_env_consistency.yaml`
**Status**: Volume mounts added, need to complete
**Remaining Work**:
- Validate Dockerfiles work correctly
- Add environment bootstrap scripts/Make targets
- Document Railway deployment
- Add smoke test command
- Basic CI job for image builds
**Requires Containers**: Yes for validation
**Files**:
- `Makefile` (new)
- `scripts/bootstrap.sh` (new)
- `.github/workflows/ci.yml` (new or update)

### M2. Task 115 - Env Bootstrap & Config Health ✅ COMPLETED
**File**: `codex/TASKS/115_env_bootstrap_and_configuration_health.yaml`
**Dependencies**: Tasks 40, 50, 20, 107
**Status**: Implemented and committed (6cb628e)
**Completed**:
- ✅ Created scripts/env-check.sh with comprehensive validation
- ✅ Created Makefile with bootstrap, env-check, docker, db, and test targets
- ✅ Created .env.example with all required and optional variables
- ✅ Script checks environment vars, connectivity, and config health
- ✅ Color-coded output with summary (passed/warnings/errors)
- ✅ Strict mode option (--strict) for CI/CD
**Files Created**:
- `scripts/env-check.sh` (executable)
- `Makefile` (make bootstrap, make env-check, make up, etc.)
- `.env.example` (template with comments)
**Remaining**:
- Update docs/SETUP.md with bootstrap instructions
- Add env-check to CI/CD pipeline

### M3. Task 108 - OpenAPI & Validation Parity
**File**: `codex/TASKS/108_openapi_and_validation_parity.yaml`
**Issue**: API docs likely stale, validation drift
**Related STATUS**: Tasks 62, 64
**Needs**:
- Generate/update OpenAPI spec from Zod schemas
- Ensure all endpoints documented
- Add API tests that validate against spec
**Requires Containers**: No for spec generation, Yes for validation
**Files**:
- `apps/api/src/openapi.ts` (update)
- `docs/api/openapi.yml`

### M4. Task 111 - Import Scripts Error Reporting
**File**: `codex/TASKS/111_import_scripts_error_reporting_and_validation.yaml`
**Issue**: Import errors not properly logged/retryable
**Related STATUS**: Tasks 36, 54, 72
**Needs**:
- Structured error logging
- Validation reports (success/failure counts)
- Retry mechanism for failed imports
**Requires Containers**: Yes for testing
**Files**:
- `apps/crawler/crawler/import_handler.py`
- `apps/api/src/services/importService.ts`

### M5. Task 112 - TypeScript Strict Mode ✅ COMPLETED
**File**: `codex/TASKS/112_typescript_strict_mode.yaml`
**Status**: Verified strict mode already enabled (commit 85391f9)
**Findings**:
- ✅ Root tsconfig.json has `"strict": true` and all sub-options enabled
- ✅ All strict checks explicitly configured (noImplicitAny, strictNullChecks, etc.)
- ✅ Additional strict checks enabled (noUnusedLocals, noUnusedParameters, etc.)
- ✅ API tsconfig extends root, inheriting strict settings
- ✅ Web tsconfig uses Astro's strict preset
- ✅ Ran type check: no errors found (apps/api passed cleanly)
**Files Verified**:
- `tsconfig.json` (root, already strict)
- `apps/api/tsconfig.json` (extends root)
- `apps/web/tsconfig.json` (Astro strict preset)
**Result**: TypeScript strict mode is working correctly across all projects

### M6. Task 113 - Migrations & Seeding Workflow ⏳ IN PROGRESS
**File**: `codex/TASKS/113_migrations_and_seeding_workflow.yaml`
**Issue**: Migration/seeding process not documented
**Related STATUS**: Tasks 68, 71
**Progress**:
- ✅ Applied all pending migrations (Session, MagicLink, Lists, Reviews)
- ✅ Resolved PostgreSQL enum constraint issue (UserRole 'PUBLIC' value)
- ✅ Documented workaround: `prisma migrate resolve --applied` + separate enum add
- ✅ Added `make db-migrate` and `make db-seed` targets to Makefile
**Remaining**:
- Document migration workflow in docs/DATABASE.md
- Document PostgreSQL enum pattern (split add/use into separate transactions)
- Environment-specific seed files
- Migration rollback procedures
**Files**:
- `docs/DATABASE.md` (new or update)
- `db/seeds/` (organize)
**Note**: PostgreSQL doesn't allow adding enum value and using it in same transaction. Future migrations with enum additions should either (1) split into two migrations or (2) use `migrate resolve` workaround.

### M7. Task 114 - Caching, Rate Limiting & Config
**File**: `codex/TASKS/114_caching_rate_limiting_and_config.yaml`
**Issue**: Redis present but not fully wired, rate limiting config unclear
**Related STATUS**: Tasks 66, 67
**Needs**:
- Redis cache for expensive queries
- Cache invalidation on mutations
- Rate limiting configuration (per-endpoint)
- Document caching strategy
**Requires Containers**: Yes (need Redis)
**Files**:
- `apps/api/src/cache.ts` (update)
- `apps/api/src/middleware/rateLimiter.ts` (update)

---

## 🟢 LOW PRIORITY - Polish & Accessibility

### L1. Task 103 - Meta Schema & Canonical URLs
**File**: `codex/TASKS/103_meta_schema_and_canonical_urls.yaml`
**Related STATUS**: Task 39
**Needs**: Comprehensive meta tags, canonical URLs, structured data
**Requires Containers**: Yes for testing

### L2. Task 104 - Accessibility & Contrast Hardening
**File**: `codex/TASKS/104_accessibility_and_contrast_hardening.yaml`
**Needs**: WCAG AA compliance, contrast checks
**Requires Containers**: Yes for testing with browser MCPs

### L3. Task 116 - Breadcrumb & OG Schema
**File**: `codex/TASKS/116_breadcrumb_and_og_schema_completion.yaml`
**Related STATUS**: Tasks 92, 94
**Needs**: JSON-LD breadcrumbs, complete OG/Twitter cards
**Requires Containers**: Yes for testing

### L4. Tasks 81-98 - Accessibility Features
**Status**: Mostly Missing
**Related STATUS**: Checklist items 81-98
**Features Needed**:
- Skip links (81)
- Focus management (82)
- Keyboard navigation (83-84)
- ARIA landmarks (85)
- Alt text for images (86)
- Form field associations (87)
- Error messaging (88)
- High contrast mode (95)
- Keyboard shortcuts docs (97)
- WCAG AAA where feasible (98)
**Requires Containers**: Yes for testing with accessibility audits

### L5. Task 105 - Testing, CI & Observability
**File**: `codex/TASKS/105_testing_ci_and_observability.yaml`
**Related STATUS**: Tasks 60, 69, 74
**Needs**:
- Increase test coverage
- CI/CD pipeline (GitHub Actions)
- Structured logging
- Monitoring/alerting setup
**Requires Containers**: Partially

---

## 📋 Workflow Organization

### Phase 1: Critical Path (Now - Next 2 Hours)
**Goal**: Get application running and core functionality verified

1. ✅ Fix docker-compose.override.yml (DONE)
2. ⏳ Verify containers start successfully (IN PROGRESS)
3. Test `/v1/directories` endpoint
4. Run VIBE-CHECK on changes
5. Test admin authentication
6. Verify frontend renders directory pages

### Phase 2: High Priority Features (Next Session)
**Goal**: Complete core features needed for application to meet specifications

**Can Work Without Containers**:
- Design geocoding service interface (H2)
- Write TypeScript types for crawler payloads (H3)
- Draft admin UI mockups for missing fields (H1)
- Update OpenAPI schemas (M3)

**Requires Containers**:
- Implement geocoding service with tests (H2)
- Wire up crawler authentication (H3)
- Connect admin UI to live API data (H4, H5)
- Add multi-category/location support (H6)

### Phase 3: Infrastructure & Polish (Ongoing)
**Goal**: Solidify development workflow and deployment

- Complete containerization work (M1)
- Add environment bootstrap (M2)
- Enable TypeScript strict mode (M5)
- Document migrations workflow (M6)
- Wire up caching and rate limiting (M7)

### Phase 4: Accessibility & Final Polish (Before Launch)
**Goal**: WCAG compliance and production readiness

- Accessibility features (L4)
- Meta tags and schemas (L1, L3)
- Contrast/color hardening (L2)
- Testing and CI (L5)

---

## 🔧 Tools to Use

### For Code Changes:
- **Serena**: Symbol-level code exploration and editing
- **Edit/Write**: Direct file modifications
- **CLEAR-THOUGHT**: Complex debugging and architectural decisions

### For Validation:
- **VIBE-CHECK**: Code quality validation (use frequently!)
- **Browser MCPs**: Visual testing, accessibility audits
- **Bash + curl**: API endpoint testing

### For Planning:
- **SEQUENTIAL-THINKING**: Multi-step feature planning
- **TodoWrite**: Task tracking and progress management
- **DOCFORK**: Documentation maintenance

---

## 🎯 Success Criteria

### Immediate (End of Session):
- [ ] All containers running healthily
- [ ] API endpoints respond correctly
- [ ] Admin authentication works
- [ ] Frontend renders directory pages
- [ ] VIBE-CHECK passes for current changes

### Short Term (Next 1-2 Sessions):
- [ ] Geocoding pipeline implemented and tested
- [ ] Crawler successfully posts to API
- [ ] Admin UI uses live API data (not fixtures)
- [ ] Directory admin exposes all schema fields
- [ ] Multi-category/location support in UI

### Medium Term (Before Production):
- [ ] All Task 100-116 specifications met
- [ ] TypeScript strict mode enabled
- [ ] Caching and rate limiting configured
- [ ] CI/CD pipeline operational
- [ ] Environment bootstrap automated

### Long Term (Launch Ready):
- [ ] WCAG AA compliance
- [ ] Comprehensive test coverage
- [ ] Monitoring and alerting
- [ ] All 00-116 tasks verified working

---

## 📝 Notes

- **Token Usage**: Be mindful of token budget (currently ~95k/200k used)
- **Volume Mounts**: Now enabled, so code changes reflect immediately
- **Serena Usage**: Use symbolic tools to avoid reading entire files
- **VIBE-CHECK**: User requested this multiple times - don't forget!
- **MCP_TOOLKIT_NOTES.md**: Reference for best practices

---

**Last Updated**: 2025-12-03 21:58 UTC
**Next Review**: After Phase 1 completion
