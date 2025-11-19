# Mega Directory

Mega Directory is a server-rendered directory listing platform built with Astro, Express, and Prisma. It supports dynamic subdomains, AI-generated content enrichment, and moderation workflows.

## Features

- 🛰️ Subdomain-based regional directories (e.g. electricians.nyc.example.com)
- ⚡ Express API with JWT-based auth
- 🧠 AI agents for crawling, enrichment, and moderation (via OpenRouter)
- 🧩 Admin dashboard for approving or rejecting listings
- 💅 Tailwind CSS and minimal JavaScript for accessibility and performance
- 🐳 Dockerized and deployable behind Cloudflare with SSR

## Tech Stack

- Astro (SSR)
- Express.js
- Prisma + PostgreSQL
- Tailwind CSS
- OpenRouter (AI Agents)
- Docker + Compose
- Cloudflare (SSL, DNS, Caching)

## Setup

### Install workspace dependencies

```bash
cd apps/api && npm install
cd apps/web && npm install
cd apps/admin && npm install
python -m pip install -r apps/crawler/requirements-dev.txt
```

Shared constants (ports, labels, etc.) live in `packages/shared-config` and are linked into each app automatically.

### Secrets and environment variables

All sensitive configuration is stored in `env.json` (encrypted with SOPS). Loading the values into your shell is the easiest way to keep every process in sync:

```bash
eval "$(make sops-env-export)"  # decrypts env.json and exports DATABASE_URL, JWT secrets, etc.
```

You can also `make sops-decrypt > .env` and `source .env` if you prefer classic dotenv files. Alternatively, copy `.env.example` to `.env` and customize for your environment.

## Environment Variables

See `.env.example` for a complete reference. Key variables:

### Service Ports (for multiple dev instances)
- `API_PORT` - Express API server port (default: `3030`)
- `ASTRO_PORT` - Astro web frontend port (default: `3000`)
- `ADMIN_PORT` - Admin interface port (default: `4000`)
- `DB_PORT` - PostgreSQL port (default: `5432`)

### Database Configuration
- `DB_HOST` - Database host (default: `localhost`)
- `DB_PORT` - Database port (default: `5432`)
- `DB_USER` - Database username (default: `postgres`)
- `DB_PASSWORD` - Database password (default: `password`)
- `DB_NAME` - Database name (default: `mega_directory`)
- `DATABASE_URL` - Full connection string (overrides individual DB_* settings)

### Authentication
- `ADMIN_API_TOKEN` - Admin UI authentication token
- `CRAWLER_BEARER_TOKEN` - Crawler authentication token
- `ADMIN_JWT_SECRET` - JWT signing secret for admin sessions
- `ADMIN_LOGIN_EMAIL` - Admin login email
- `ADMIN_LOGIN_PASSCODE` - Admin login passcode

### API Configuration
- `API_BASE_URL` - API server base URL (default: `http://localhost:3030`)
- `PUBLIC_API_BASE_URL` - Public API URL for Astro frontend (default: `http://localhost:3030`)
- `ADMIN_API_BASE_URL` - Admin API URL (default: `http://localhost:3030`)

### External APIs (optional)
- `OPENAI_API_KEY` - OpenAI API key for LLM features
- `OPENROUTER_API_KEY` - OpenRouter API key for LLM features
- `GEMINI_API_KEY` - Google Gemini API key
- `GEOCODEMAPS_API_KEY` - GeocodeMAPS API key
- `GOOGLEMAPS_API_KEY` - Google Maps API key

### Features
- `SKIP_CRAWLER=1` - Disable automatic crawler startup in dev-bootstrap.sh

**Important:** `ADMIN_API_TOKEN` and `CRAWLER_BEARER_TOKEN` must have identical values.

### Running Multiple Development Instances

To run multiple instances on the same machine, use different ports:

```bash
# Instance 1 (default)
./scripts/dev-bootstrap.sh

# Instance 2 (custom ports)
DB_PORT=5433 DB_NAME=mega_directory_2 \
API_PORT=3031 ASTRO_PORT=3001 ADMIN_PORT=4001 \
./scripts/dev-bootstrap.sh
```

See [DEVOPS.md](./DEVOPS.md#running-multiple-development-instances) for complete details.

### Initialize a brand-new database

Database schema and seed scripts live under `/db`. Run Prisma commands from anywhere in the repo (they default to `db/schema.prisma`):

1. **Provision Postgres** – local server, Docker, or a managed service; note the resulting `DATABASE_URL`.
2. **Install Prisma tooling (first run only)** – `npm install --save-dev prisma && npm install @prisma/client`.
3. **Apply the migrations** – `DATABASE_URL=postgresql://... npx prisma migrate deploy --schema db/schema.prisma` (or `migrate dev` while iterating). This executes `db/migrations/001_core_schema/migration.sql` → `002_location_hierarchy/migration.sql` → `003_listings_table_enhancements/migration.sql`.
4. **Generate the Prisma client** – `DATABASE_URL=postgresql://... npx prisma generate --schema db/schema.prisma` so both scripts and the API can talk to the DB.
5. **Seed required data**  
   - `DATABASE_URL=postgresql://... npx ts-node db/scripts/seedGeography.ts` loads the bundled geography sample (`db/geography/sample`) or a full dataset when `GEO_DATASET_DIR`/`GEO_POSTAL_FILE` are set.
   - `DATABASE_URL=postgresql://... npx ts-node db/seed.ts` creates the demo admin, categories, directories, listings, and featured slots.

You can re-run the seeders safely; they upsert by natural keys.

### Geographic Seed Data

The global hierarchy for countries, states/provinces, cities, and postal codes
is populated with `db/scripts/seedGeography.ts`. By default the script loads the
small fixtures under `db/geography/sample`, but you can point it at the full
datasets from the dr5hn and GeoNames projects:

```bash
GEO_DATASET_DIR="$HOME/datasets/geography" \
GEO_POSTAL_FILE="$HOME/datasets/geography/allCountries.txt" \
npx ts-node db/scripts/seedGeography.ts
```

See `db/geography/README.md` for the expected file layout, batching controls,
and notes about countries that do not issue postal codes.

### Local development instance (API + Web + Admin + DB)

There are two supported ways to run the full stack locally:

1. **Bootstrap script (recommended)**  
   ```bash
   eval "$(make sops-env-export)"         # loads DATABASE_URL plus JWT/crawler secrets
   ./scripts/dev-bootstrap.sh             # starts API (3030), web (3000), admin (4000), crawler
   ```
   The script installs missing npm/pip deps, forwards the environment variables listed above, and points every service at the same `DATABASE_URL`. Set `SKIP_CRAWLER=1` to leave the crawler offline or override ports/secrets with the documented env vars (`API_PORT`, `ASTRO_PORT`, `ADMIN_PORT`, `ADMIN_JWT_SECRET`, `CRAWLER_API_TOKEN`, etc.).

2. **Manual control**  
   - Ensure Postgres is running and migrations + seeders have completed.
   - Start the API: `cd apps/api && DATABASE_URL=... ADMIN_JWT_SECRET=... npm run dev`.
   - Start the Astro frontend: `cd apps/web && API_BASE_URL=http://localhost:3030 npm run dev`.
   - Start the Admin UI: `cd apps/admin && API_BASE_URL=http://localhost:3030 ADMIN_API_BASE_URL=http://localhost:3030 ADMIN_API_TOKEN=... npm run dev`.
   - (Optional) Start the crawler with `python apps/crawler/dev_runner.py --run-once` or `python main.py`.

All services expect the same `DATABASE_URL` and shared secrets so moderation actions, featured slots, and crawler ingestion use the same state.

## Running with Docker Compose

`docker-compose.yml` defines only the core platform services: `api`, `db`, and the Astro-powered `web` frontend. Bring them up together with:

```bash
docker compose up --build
```

Provide an `.env` file for the API service (e.g., JWT secrets, database URLs) before running Compose. Postgres data is stored in the `pgdata` volume declared in the compose file.

### Production node (Web + API + DB)

Typical production deployments run the Astro SSR frontend and Express API alongside a managed Postgres instance (Railway, Render, Fly.io, bare metal, etc.). The high-level flow matches local setup:

1. Provision Postgres and export `DATABASE_URL`. Run the Prisma migrations and seed steps from the **Initialize a brand-new database** section once per environment (staging, prod, etc.).
2. Build the API: `cd apps/api && npm run build`. Start it with a process manager (`node dist/server.js`, PM2, systemd, Docker) while providing `DATABASE_URL`, JWT secrets, crawler/admin tokens, and `PORT`.
3. Build the web frontend: `cd apps/web && npm run build`. Deploy the generated SSR bundle with `npm run start` (Node), `astro build --adapter=node`, Docker, or your preferred platform. Set `API_BASE_URL` so the frontend calls the correct API host.
4. Front a CDN/proxy (e.g., Cloudflare) to terminate TLS and direct traffic:  
   - `https://api.example.com` → API service  
   - `https://www.example.com` (or subdomains) → Astro SSR service
5. Backups & monitoring: enable automated Postgres snapshots, point your uptime checks at `/health`, and forward structured logs to your stack (Railway, Logtail, etc.).

For fully containerized deployments, reuse the Dockerfiles in `apps/api/Dockerfile` and `apps/web/Dockerfile` or the Compose file as a template.

### Admin node (Admin UI + API)

The admin interface is a lightweight Express app that talks to the same API the public stack uses. You can co-host it with the API or deploy it separately (e.g., behind a company VPN):

1. Install dependencies and build: `cd apps/admin && npm install && npm run build`.
2. Supply the required env vars when starting the service:
   - `PORT` – listening port (defaults to 4000 locally).
   - `API_BASE_URL` – URL that powers the marketing site (used for links).
   - `ADMIN_API_BASE_URL` – internal/admin API endpoint (often the same as API_BASE_URL).
   - `ADMIN_API_TOKEN` – bearer token that the admin UI sends to `/v1/admin/**` routes.
3. Run the admin server: `node dist/server.js` (or wrap it with your process manager / Docker image).
4. Ensure the target API instance already trusts the admin token (`ADMIN_API_TOKEN`) and that migrations/seeds have run against the shared database.
5. Optionally host multiple admin nodes (e.g., operations, support) by pointing them at the same API and rotating the token via `env.json`.

## Logging & Monitoring

- The Express API emits JSON logs (request + application events) to stdout. Override the level with `LOG_LEVEL=info` or `debug` as needed—Railway and Docker automatically capture the output.
- `GET /health` now returns uptime metadata so monitors like UptimeRobot or Better Stack can alert when the service fails its liveness probe.
- The Python crawler uses the standard `logging` module; set `CRAWLER_LOG_LEVEL` (defaults to `DEBUG` locally, `INFO` in production) to tune verbosity when running long jobs.
- See `docs/monitoring.md` for tips on wiring the `/health` endpoint into UptimeRobot and for tailing logs via Railway CLI.

## Railway Deployment

The repository is ready to deploy on [Railway](https://railway.app) using the Dockerfiles under `apps/api/` and `apps/web/`. Follow the step-by-step guide in `docs/deployment/railway.md` to provision the Postgres plugin, deploy the two services, and wire their environment variables together.

## Admin & Crawler Tools

The admin interface and crawler agent run outside Docker so that they can be operated from developer machines or private servers.

- Admin interface:  
  ```bash
  cd apps/admin
  npm run dev
  ```
- Python crawler agent (configure `apps/crawler/config/targets.json` first):  
  ```bash
  cd apps/crawler
  python main.py
  ```
  To replay the built-in demo data against your local API without touching real websites, run:
  ```bash
  python apps/crawler/dev_runner.py --run-once
  ```

Additional details about each agent live in `docs/AGENTS.md`.

### Dev Bootstrap Script

When you need the entire stack (API + web + Admin + crawler) running locally, use the helper script:

```bash
./scripts/dev-bootstrap.sh
```

It launches:

- the Express API on `http://localhost:3030` with sensible JWT/crawler secrets,
- the Astro frontend on `http://localhost:3000`,
- the Admin UI on `http://localhost:4000`, and
- a demo crawler loop that replays sample listings into the API every 45 seconds so you always have fresh data to review.

Override any port or secret via environment variables (e.g., `API_PORT`, `ASTRO_PORT`, `ADMIN_PORT`, `CRAWLER_INTERVAL`, `ADMIN_JWT_SECRET`, `CRAWLER_API_TOKEN`). Set `SKIP_CRAWLER=1` if you want to keep the crawler offline. The script requires `npm` and `python3` to be available on your PATH.

The bootstrapper now installs missing dependencies for you: it runs `npm install` for the API, web, and admin workspaces when their `node_modules/` folders are absent and installs the crawler's Python requirements from `apps/crawler/requirements-dev.txt` (using `pip --user` unless you're already inside a virtual environment). Set `DEV_BOOTSTRAP_FORCE_INSTALL=1` to force a reinstall if you need to pick up dependency changes.

## Project Structure

```
/apps
  /api        - TypeScript Express API, health checks, ingestion endpoints
  /web        - Astro SSR frontend and shared UI components
  /admin      - Standalone moderation UI
  /crawler    - Python crawler agent source + configs
/packages
  /shared-config - Reusable constants shared across apps
/codex/TASKS  - Codex YAML task definitions
/db           - Prisma schema and seeding scripts
/docs         - Developer documentation (see docs/AGENTS.md)
/scripts      - Local tooling (bootstrap helpers, etc.)
```

## License

MIT
