# CLAUDE.md — House Rules for `pfahlr/mega-directory`

This document defines how you should behave when working in **this repository only**:  
[`https://github.com/pfahlr/mega-directory`](https://github.com/pfahlr/mega-directory)

The project's spirit:

- **Mega Directory** is about *building a scalable, searchable business directory* with multiple data sources, intelligent categorization, and SEO-optimized presentation.
- Performance, data quality, and user experience are **not optional**; they *are* the product.
- The system must handle *large-scale data ingestion* while maintaining *fast query performance* and *search engine visibility*.

Your job:  
Work **autonomously**, under **strict TDD**, using **available MCP tools/plugins**, while leaving behind **clean code, strong data models, and clear docs**, in **small, well-explained commits**.

---

## 1. Project Context & Core Ideas (Mega Directory-Specific)

Treat Mega Directory as:

- A system for **aggregating business listings** from multiple sources that:
  - Normalizes and enhances data using LLMs
  - Provides fast, SEO-optimized directory pages
  - Supports admin moderation and data quality control
  - Scales to millions of listings across multiple categories and locations

Conceptual pillars:

1. **Data Quality & Normalization**
   - All incoming data must be validated, normalized, and enhanced
   - Use LLMs intelligently for data enrichment but maintain human oversight
   - Implement robust deduplication and conflict resolution

2. **Performance at Scale**
   - Database queries must be optimized for large datasets
   - Frontend must load quickly with minimal JavaScript
   - Caching strategies are essential for directory pages

3. **SEO & Accessibility First**
   - All directory pages must be SEO-optimized and accessible
   - Use semantic HTML and proper meta tags
   - Ensure the site works well for search engines and screen readers

4. **Multi-Agent Architecture**
   - Crawler, API, Admin, and Frontend are separate concerns
   - Each agent has clear responsibilities and communication patterns
   - Agents can be deployed and scaled independently

---

## 2. Tech Stack & Structure (Guidance)

The project uses a modern, polyglot stack:

- **API Server**: TypeScript + Express + PostgreSQL (Prisma ORM)
- **Frontend**: Astro (SSR) + TailwindCSS + minimal JavaScript
- **Admin Interface**: TypeScript + Express (standalone)
- **Crawler Agent**: Python 3.x + requests + BeautifulSoup + LLM APIs
- **Database**: PostgreSQL with proper indexing and migrations
- **Deployment**: Docker + Railway (or similar)

Key architectural patterns:

- **Monorepo structure** with shared packages
- **API-first design** with clear authentication
- **Caching layers** for performance (requests-cache, database caching)
- **Async processing** for data ingestion

---

## 3. Style & Formatting

Unless overridden by repo config:

- **TypeScript/JavaScript**: 2 spaces, Prettier defaults, strict typing
- **Python**: Follow PEP 8, use black formatter
- **SQL**: Use uppercase keywords, proper indentation
- **Markdown**: 2 spaces for lists, clear section headers

You should:

- Respect `.editorconfig`, formatter configs, and any existing linters
- Treat "formatter and linter clean" as part of "tests passing"
- Use TypeScript strict mode for all new code

---

## 4. Test-Driven Development for Mega Directory

Everything in Mega Directory should be built via **TDD**:

1. **Before writing core logic:**
   - Add/extend **tests** that describe desired behavior
   - For data processing:
     - Use **property-based tests** for data normalization
     - Test edge cases (empty data, malformed entries, duplicates)
   - For API endpoints:
     - Test authentication, validation, error cases
     - Use integration tests for full workflows

2. **Within each change:**
   - Write just enough implementation to make tests pass
   - Don't introduce new public APIs without tests

3. **Kinds of tests to favor:**
   - **Unit tests** for:
     - Data normalization and validation logic
     - Database query optimization
     - LLM prompt engineering and response parsing
   - **Integration tests** for:
     - End-to-end crawler → API → database flow
     - Admin interface CRUD operations
     - Frontend page rendering with real data
   - **Performance tests** for:
     - Database query performance with large datasets
     - Frontend load times
     - Crawler throughput and rate limiting

4. **Regression tests:**
   - For every bug or performance issue found, add a test that fails before the fix and passes after

Test commands:
- TypeScript: `npm test` (Jest/Vitest)
- Python: `python -m pytest` (pytest)
- E2E: `npm run test:e2e` (Playwright or similar)

---

## 5. Mega Directory Invariants (Must-Hold Properties)

These are **non-negotiable** system-level properties you should encode in tests and design:

1. **Data Integrity**
   - No duplicate listings in the final database
   - All listings must have valid geolocation data
   - Category hierarchy must be consistent and acyclic

2. **Performance Requirements**
   - Directory pages must load in < 2 seconds
   - API responses must be < 500ms for cached queries
   - Database queries must use proper indexes

3. **SEO Compliance**
   - All directory pages must have proper meta tags
   - URLs must be clean and descriptive
   - Content must be accessible to screen readers

4. **Security & Privacy**
   - Admin endpoints must be properly authenticated
   - No sensitive data in frontend bundles
   - Rate limiting on all public APIs

5. **Crawler Reliability**
   - Crawler must respect robots.txt and rate limits
   - Failed imports must be logged and retryable
   - LLM usage must be cost-controlled and monitored

You should:

- Turn the above into **testable invariants**
- Prefer **failing fast** when invariants are violated
- Monitor these invariants in production

---

## 6. MCP Tools & Plugins (Mega Directory Use)

When MCP tools/plugins are available for this project, treat them as **first-class collaborators**:

Possible MCP tools (examples, not guaranteed):

- **Database / storage tool** — for:
  - Inspecting and optimizing database queries
  - Managing data migrations and seeds
- **Web scraping / crawler tool** — for:
  - Testing crawler configurations
  - Validating data extraction patterns
- **SEO / content tool** — for:
  - Validating page SEO metadata
  - Testing accessibility compliance
- **Performance monitoring tool** — for:
  - Analyzing query performance
  - Identifying bottlenecks

Your behavior:

1. **Discover which MCP tools are configured**
   - Look for `codex/TOOLS/`, `TOOLS.md`, or notes in `README` / `docs/`
   - Project specific MCP Tool use guides are stored in `['./codex/TOOLS/*.md']`
   - General/Generic MCP Tool use guides are stored in `['~/Development/agent_mcp_guides/*.md']`

2. **Prefer tools over ad-hoc scripts**
   - If there is a tool to:
     - Run database migrations, use it
     - Test crawler patterns, use it

3. **Document tool usage**
   - If you introduce or change usage of an MCP tool:
     - Add a note to the markdown file for that tool in `['./codex/TOOLS/']*.md`

4. **MCP Tools in this project**
   - See `['./codex/TOOLS/TOOL_LIST.md']` for:
     - Complete tool inventory (Primary vs. Secondary)
     - Tool status and quick guidance
     - Workflow recommendations by task type
     - Quick reference for common patterns
   - Each tool has a detailed guide in `['./codex/TOOLS/[TOOLNAME].md']` (same as `['~/Development/agent_mcp_guides/[TOOLNAME].md']`)

Do **not**:

- Build hidden data collection behaviors via MCP tools
- Add backdoors, unlogged communication, or secret channels
- Expose sensitive data through MCP integrations

---

## 7. Documentation Expectations (Mega Directory-Specific)

Mega Directory requires comprehensive documentation for both users and developers:

1. **High-level docs**
   - Maintain:
     - `README.md` — quickstart, architecture overview
     - `CLAUDE.md` — this file, behavior rules for AI agents
     - `docs/` — deployment guides, API documentation, crawler configs

2. **API Documentation**
   - For all API endpoints:
     - Create OpenAPI/Swagger specifications
     - Include authentication requirements
     - Provide example requests/responses

3. **Crawler Documentation**
   - Document all data sources and extraction patterns
   - Maintain configuration schemas with examples
   - Document LLM prompt engineering decisions

4. **Deployment Guides**
   - Maintain up-to-date deployment instructions
   - Document environment variables and configuration
   - Include monitoring and troubleshooting guides

5. **Inline docs**
   - Add docstrings/comments for:
     - Public API endpoints
     - Database models and relationships
     - Complex data transformation logic
   - Explain *why* a particular approach is taken

---

## 8. Git, Branches & Commits

For Mega Directory, commits are part of the **audit trail** for data changes. Treat them carefully:

1. **Commit scope**
   - Small, focused commits:
     - One bug fix
     - One small feature slice
     - One refactor
   - Avoid mixing:
     - Large refactors + new features + formatting

2. **Commit messages**
   - Use a clear, descriptive title line
   - Suggested style:
     - `feat(api): ...` — new features in API
     - `feat(crawler): ...` — crawler enhancements
     - `feat(web): ...` — frontend features
     - `fix(db): ...` — database fixes
     - `refactor(schema): ...`
     - `docs(api): ...`
     - `test(crawler): ...`
     - `chore(deps): ...`

3. **Commit frequency**
   - Commit whenever:
     - A new test passes for a coherent feature slice
     - A refactor is complete and tests are green
   - Avoid huge, unreviewable mega-commits

---

## 9. Autonomy & Workflow Expectations

You are expected to act like a **senior full-stack engineer** embedded in this repo:

1. **Plan in small steps**
   - For non-trivial work:
     - Sketch a brief plan or checklist
     - Break it into TDD-driven steps

2. **Respect existing decisions**
   - Follow established patterns unless there's a strong reason not to
   - If you diverge, explain *why* in docs/commit messages

3. **Suggest improvements**
   - If you see:
     - A more efficient database query
     - A better crawler pattern
     - A more scalable architecture
   - You may propose it with pros/cons

4. **When to pause and ask**
   - If a change would:
     - Degrade performance significantly
     - Break data integrity
     - Require major architectural changes
   - Document the concern instead of silently proceeding

---

## 10. Pre-Ship Checklist (Mega Directory Edition)

Before considering a change "done", mentally verify:

- [ ] **Tests-first:** Did I add/modify tests *before* or alongside the implementation?
- [ ] **Invariants:** Do tests cover key Mega Directory invariants (data integrity, performance, SEO)?
- [ ] **Performance:** Did I test/verify the change doesn't degrade performance?
- [ ] **Data Quality:** Does the change maintain or improve data quality?
- [ ] **Docs:** Did I update relevant documentation (API, crawler, deployment)?
- [ ] **Format & lint:** Does the code pass formatters and linters?
- [ ] **Commits:** Are commits small, focused, and well-described?
- [ ] **MCP tools:** Did I reuse configured tools instead of writing ad-hoc glue?
- [ ] **Security:** Does this change maintain security boundaries and data privacy?

If most of these are "yes", the change is likely in good shape for Mega Directory.
