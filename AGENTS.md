# AGENTS.md

This document outlines the purpose and operation of each core agent in the **Mega Directory** project architecture.

---

## 🧠 Crawler Agent (Python)

**Purpose:**
Collect business listings from predefined online sources, optionally enhance them using LLMs, and send the data to the API server.

**Key Technologies:**

* Python 3.x
* `requests`, `beautifulsoup4`, `requests-cache`, `jinja2`
* External LLM APIs (OpenRouter, OpenAI, Google Gemini)

**Responsibilities:**

* Fetch listings using category/location/keyword-driven config
* Use SQLite caching to avoid refetching the same page for 30 days
* Per-field LLM generation (based on a YAML/JSON config)
* POST data securely to a remote or local API instance

**Deployment:**
Runs independently from dev machines or private servers. Not bundled in production deploys.

---

## 🧰 Admin Interface

**Purpose:**
Moderate new listings, approve categories, and edit SEO metadata for any page.

**Key Technologies:**

* Lightweight web stack (Astro, Express, or similar)
* HTML forms with save/deactivate toggles
* Authentication (token-based or admin login)

**Responsibilities:**

* Review, edit, and approve new listings
* Manage and approve new categories/locations
* Edit SEO metadata for category/location pages

**Deployment:**
Runs separately. Connects to the live or dev API endpoint. Not bundled in production deploys.

---

## 🚀 Web Frontend (Astro)

**Purpose:**
Deliver ultra-fast directory pages optimized for SEO and accessibility.

**Key Technologies:**

* Astro with SSR mode
* TailwindCSS
* Minimal JavaScript

**Responsibilities:**

* Serve dynamic directories based on location/category
* Display featured and scored listings
* Pull data from the API based on subdomain or path

**Deployment:**
Bundled in production deployments (e.g., on Railway or Docker).

---

## 🔗 API Server (Express.js)

**Purpose:**
Serve listings to the frontend, receive data from crawler, and power the admin interface.

**Key Technologies:**

* Node.js + Express
* PostgreSQL (via Prisma or native driver)
* JWT and API token auth

**Responsibilities:**

* Serve listings data to the frontend
* Accept and validate new data from the crawler
* Manage admin APIs for listing approval and SEO editing

**Deployment:**
Bundled in production deployments. Always connected to the Postgres DB.

---

## 🤖 Codex Agent (LLM Developer Assistant)

**Purpose:**
Aid in code generation, refactoring, and optimization using a test-driven development (TDD) paradigm.

**Key Technologies:**

* Large Language Model (Codex, GPT-4, or equivalent)
* Integration with dev tools, editors, or CLI (e.g., VSCode, CLI prompt wrappers)
* Works alongside unit testing frameworks (e.g., Jest, Vitest, Pytest)

**Responsibilities:**

* Write tests **before** code is generated, per TDD best practices
* Validate if existing or generated code passes the tests
* Use test output (pass/fail logs) to drive iterative refactoring
* Provide diffs or patch-style suggestions based on test failures
* Recommend additional edge cases or missing test coverage
* Summarize test coverage and offer suggestions for improvement
* Work in tandem with human developers to clarify test expectations and constraints

**Test Workflow:**

1. Prompt for functionality → Codex generates **failing tests** first
2. Generate **minimal code** to pass tests
3. Execute test suite and capture results
4. Use test feedback to improve code until all tests pass
5. Offer refactor suggestions once tests are passing
6. Propose new test cases for edge conditions or regressions

**Deployment:**
Codex runs locally (via CLI or IDE plugin) or via cloud-hosted assistant. Integrated into CI pipelines when possible for autonomous iteration.

