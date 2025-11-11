# CODEX TODO

This document lists the Codex tasks in their recommended execution order.
Each task corresponds to a YAML file under `/codex/TASKS/`.

---

## 00 - Repository Setup

- [ ] 00_prepare_repository.yaml — Prepare the repository structure, move directories into place, update README and docker-compose config.

---

## 01–05 - Core Scaffolding

- [ ] 01_initialize_astro_frontend.yaml — Scaffold the Astro SSR frontend site.
- [ ] 02_initialize_api_server.yaml — Set up the Express/PostgreSQL API server with base routing and JWT auth.
- [ ] 03_initialize_database_schema.yaml — Define and migrate core tables: listings, categories, locations, directory.
- [ ] 04_initialize_admin_app.yaml — Scaffold a separate admin web interface with basic routing and layout.
- [ ] 05_initialize_python_crawler.yaml — Bootstrap the external Python-based crawler project with config loading and CLI entrypoint.

---

## 06–08 - Basic Integration

- [ ] 06_api_endpoints_listings.yaml — Implement API endpoints for creating, editing, and retrieving listings.
- [ ] 07_api_endpoints_categories.yaml — Implement API endpoints for categories, category-location pages, and directory metadata.
- [ ] 08_api_token_auth.yaml — Implement token-based auth for crawler/Admin access to secured endpoints.

---

## 09–11 - Crawler Feature Buildout

- [ ] 09_crawler_scraping_and_caching.yaml — Implement scraping logic using requests, BeautifulSoup4, and requests-cache (30-day SQLite).
- [ ] 10_llm_field_generation.yaml — Add field-level LLM generation with Jinja2 prompts and provider config (OpenAI, OpenRouter, Gemini).
- [ ] 11_crawler_config_driven_execution.yaml — Support JSON-driven category/location targets and post results to API endpoint.

---

## 12–13 - Admin Interface: Listing Review

- [ ] 12_admin_listings_review_ui.yaml — Build listing review UI (50 per page, edit/save/deactivate options).
- [ ] 13_admin_listings_patch_api.yaml — Add Admin API endpoint for updating, saving, or deactivating listings.

---

## 14–15 - Admin Interface: Categories & SEO

- [ ] 14_admin_category_approval_ui.yaml — UI for reviewing and approving new category/location combinations.
- [ ] 15_admin_category_seo_editor.yaml — UI for editing category/location SEO meta title and description.

---

## 16–17 - Frontend Integration

- [ ] 16_frontend_directory_routing.yaml — Implement SSR routes per category/location from the directory table.
- [ ] 17_frontend_listing_display.yaml — Listing grid display, listing page, and meta injection for SEO.

---

## 18–19 - DevOps & Deployment

- [ ] 18_dockerize_all_services.yaml — Create Dockerfiles for `/api`, `/astro`, and set up services in `docker-compose.yml`.
- [ ] 19_env_and_logging.yaml — Standardize `.env` handling, logging output format, and secrets for dev/prod environments.

---

## 20 - Final Verification & Manual Testing

- [ ] 20_manual_test_run_and_cleanup.yaml — Run through a full cycle: run crawler, approve listings, verify live site updates. Confirm everything is wired together.
