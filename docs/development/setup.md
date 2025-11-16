# Mega Directory Development Setup Guide

This guide explains how to configure a workstation for Mega Directory, how the monorepo is organized, and how to manage secrets with `env.json`, SOPS, and the provided Makefile targets. Keep this document close when onboarding new developers or rotating API keys.

## 1. Prerequisites

Install the following tools before running anything from the repo:

- **Node.js 20+ and npm** – workspaces are classic `npm` projects.
- **Python 3.10+** – used by the crawler, text importer, and dev bootstrapper.
- **PostgreSQL 15+ or Docker** – API needs a Postgres instance; Docker Compose can start one for you.
- **SOPS** (`sops` CLI) – encrypts/decrypts `env.json`.
- **GnuPG** – import the team PGP key with fingerprint `CB3B963C0AB97B34BAF22D68F9D46501F1146F9F`.
- **jq** – used by `make sops-env-export` to transform JSON into `export` statements.
- Optional: `direnv`, Docker Desktop/Podman, Railway CLI.

## 2. Repository Layout and Tooling

| Path | Purpose | Dev commands | Default port(s) |
| --- | --- | --- | --- |
| `apps/api` | Express + Prisma API server (listings, admin routes, geocoding) | `npm run dev`, `npm test` | 3030 |
| `apps/web` | Astro SSR frontend | `npm run dev`, `npm run build` | 3000 |
| `apps/admin` | Express + EJS admin console | `npm run dev` | 4000 |
| `apps/crawler` | Python crawler, enrichment tooling, text importer | `python main.py`, `python dev_runner.py` | n/a |
| `packages/shared-config` | Shared constants for ports, labels, API routes | consumed via npm workspaces | n/a |
| `db` | Prisma schema, migration helpers, `seedGeography.ts` | `npx ts-node db/scripts/seedGeography.ts` | n/a |
| `scripts/dev-bootstrap.sh` | Spins up API + web + admin (+ optional crawler) with sensible defaults | `./scripts/dev-bootstrap.sh` | 3000–4000 |
| `docker-compose.yml` | API + web + Postgres for quick demos | `docker compose up --build` | Same as above |

> Tip: `npm install` at the repo root installs workspace dependencies for all JavaScript packages. The dev bootstrap script also installs missing dependencies automatically when `node_modules` is absent.

## 3. Secrets and Environment Management

### 3.1 Source of truth files

- `.env.example` – human-readable defaults; copy values when creating new secrets.
- `.env` – optional local overrides (ignored by git); **do not commit**.
- `env.json` – canonical secrets store, encrypted with SOPS. Values without `_unencrypted` or `_pt` suffixes are encrypted at rest.
- `.sops.yaml` – enforces encryption rules and recipients. By default every file is encrypted for the shared PGP key and fields ending in `_unencrypted` remain plaintext.

### 3.2 Makefile helpers (`Makefile`)

| Target | What it does | Example |
| --- | --- | --- |
| `make sops-encryptkeys [FILE=env.json]` | Encrypts/rewrites a JSON secrets file. Run after editing decrypted content. | `make sops-encryptkeys` |
| `make sops-updatekeys [FILE=env.json]` | Re-wraps the file using recipients from `.sops.yaml` (useful when adding new PGP keys). | `make sops-updatekeys FILE=config/other.json` |
| `make sops-decrypt [FILE=env.json]` | Prints decrypted JSON to stdout (redirect to a temporary file if needed). | `make sops-decrypt > env.local.json` |
| `make sops-env-export [FILE=env.json]` | Decrypts JSON, strips `_pt`/`_unencrypted` suffixes, and outputs `export KEY=value` lines ready to `eval`/`source`. Requires `jq`. | `eval "$(make sops-env-export)"` |

### 3.3 Typical workflow

1. **Decrypt for editing**  
   ```bash
   make sops-decrypt > env.local.json
   ```
   Edit `env.local.json`, keeping sensitive values without `_unencrypted` suffixes.

2. **Re-encrypt and replace**  
   ```bash
   mv env.local.json env.json
   make sops-encryptkeys
   ```

3. **Load values into your shell**  
   ```bash
   # One-off shell session
   eval "$(make sops-env-export)"

   # or write an .env file
   make sops-decrypt > .env && direnv allow
   ```

4. **Add/rotate keys** – append new entries (e.g., `GEOCODEMAPS_API_KEY`) to `env.json`, encrypt, and share the updated file. Remember to update `.sops.yaml` if you add more PGP recipients or cloud KMS keys.

> `_unencrypted` suffix: SOPS leaves these values as plaintext (useful for innocuous defaults like `"PORT_unencrypted": "3030"`). `sops-env-export` automatically removes the suffix so `PORT` lands in your shell with the plaintext value.

### 3.4 Secrets you need

| Service | Variables | Notes |
| --- | --- | --- |
| Postgres | `DATABASE_URL` | Format: `postgresql://user:pass@host:port/db`. Used by API and scripts. |
| Authentication | `ADMIN_JWT_SECRET`, `ADMIN_JWT_ISSUER`, `ADMIN_JWT_AUDIENCE`, `ADMIN_TOKEN_TTL_SECONDS` | Power admin login/session tokens. |
| Admin bootstrap creds | `ADMIN_LOGIN_EMAIL`, `ADMIN_LOGIN_PASSCODE` | Seed user for `/v1/admin/auth/login`. Rotate post-onboarding. |
| API tokens | `CRAWLER_BEARER_TOKEN`, `ADMIN_API_TOKEN`, `API_TOKEN` | Tokens used by crawler, admin UI submissions, or partner ingestion. |
| Geocoding | `GEOCODEMAPS_API_KEY`, `GOOGLEMAPS_API_KEY` | API tries Maps.co first, then Google as fallback. |
| LLM providers | `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | Used by crawler enrichment + text importer. Only set the providers you plan to call. |

## 4. Environment Variables by Component

### 4.1 Shared / global

- `NODE_ENV`, `LOG_LEVEL` – toggles logging and dev/prod behavior across services.
- `PORT` – consumed by whichever service you launch in the current directory.

### 4.2 API server (`apps/api`)

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default 3030). |
| `DATABASE_URL` | Prisma/Postgres connection string. |
| `ADMIN_JWT_SECRET`, `ADMIN_JWT_ISSUER`, `ADMIN_JWT_AUDIENCE`, `ADMIN_TOKEN_TTL_SECONDS` | JWT signing + verification settings for the admin dashboard. |
| `ADMIN_LOGIN_EMAIL`, `ADMIN_LOGIN_PASSCODE` (or `ADMIN_EMAIL`/`ADMIN_PASSCODE`) | Seed credentials for the admin auth endpoint. |
| `CRAWLER_BEARER_TOKEN` | Token required by `/v1/crawler/listings`. Mirror in crawler config. |
| `GEOCODEMAPS_API_KEY`, `GOOGLEMAPS_API_KEY` | Primary and fallback geocoding providers. |
| `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` | Optional – passed to enrichment workers that the API may spin up. |

### 4.3 Web frontend (`apps/web`)

- `PUBLIC_API_BASE_URL` (Astro `PUBLIC_` prefix ensures bundler exposure). Controls which API endpoint directory pages use. The dev bootstrap script injects `http://localhost:3030`.

### 4.4 Admin interface (`apps/admin`)

- `PORT` (default 4000).
- `ADMIN_API_BASE_URL` (preferred) or `API_BASE_URL` – API origin for moderation endpoints.
- `ADMIN_API_TOKEN` – bearer token sent with moderation POSTs.

### 4.5 Python crawler & text importer (`apps/crawler`)

| Variable | Purpose |
| --- | --- |
| `CRAWLER_API_ENDPOINT` | Target API URL (defaults to `/v1/crawler/listings`). |
| `CRAWLER_API_TOKEN` / `CRAWLER_BEARER_TOKEN` | Authentication token matching the API server. |
| `CRAWLER_LOG_LEVEL` | Overrides logging level (`DEBUG`, `INFO`, etc.). |
| `TEXT_IMPORT_LLM_PROVIDER`, `TEXT_IMPORT_LLM_MODEL`, `TEXT_IMPORT_LLM_API_KEY`, `TEXT_IMPORT_LLM_BASE_URL`, `TEXT_IMPORT_LLM_TIMEOUT`, `TEXT_IMPORT_LLM_SYSTEM_PROMPT`, `TEXT_IMPORT_PROMPT_TEMPLATE` | Optional overrides for the text import pipeline. |
| `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` | Picked up automatically if specific `TEXT_IMPORT_*` vars are not provided. |

### 4.6 Tooling helpers

`./scripts/dev-bootstrap.sh` honors:

- `API_PORT`, `ASTRO_PORT`, `ADMIN_PORT` – override default ports.
- `API_BASE_URL`, `ADMIN_API_BASE_URL` – force specific origins for frontend/admin when API runs elsewhere.
- `ADMIN_JWT_SECRET`, `ADMIN_LOGIN_EMAIL`, `ADMIN_LOGIN_PASSCODE`, `CRAWLER_API_TOKEN`, `ADMIN_API_TOKEN`, `DATABASE_URL` – override defaults when you want the bootstrapper to mirror real secrets.
- `SKIP_CRAWLER=1` – keep the demo crawler offline.
- `DEV_BOOTSTRAP_FORCE_INSTALL=1` – force reinstall of npm/pip dependencies.
- `PYTHON_BIN` – choose a non-default Python interpreter.

Docker Compose uses the same values baked into `docker-compose.yml` but you can override them by exporting variables before running `docker compose up`.

## 5. Running the Stack

### 5.1 Quick bootstrap (recommended for day-to-day work)

```bash
eval "$(make sops-env-export)"   # load secrets into your shell
./scripts/dev-bootstrap.sh
```

The script installs missing npm/pip deps, launches the API, Astro frontend, admin UI, and (unless `SKIP_CRAWLER=1`) the demo crawler loop. Ports are printed in the terminal, and the script traps Ctrl+C to stop everything cleanly.

### 5.2 Manual startup

1. Install dependencies: `npm install` (repo root) and `python -m pip install -r apps/crawler/requirements-dev.txt`.
2. Start Postgres (local server or `docker compose up db`).
3. Export required env vars (see Section 4) – easiest via `make sops-env-export`.
4. Start each service from its directory (`npm run dev` for `apps/api`, `apps/web`, `apps/admin`; `python apps/crawler/dev_runner.py --run-once` for the crawler).

### 5.3 Database seeding

- Run `npx ts-node db/scripts/seedGeography.ts` to load the sample geography data under `db/geography/sample`. Provide `GEO_DATASET_DIR`/`GEO_POSTAL_FILE` to point at full datasets (see `README.md` and `db/geography/README.md` for details).
- Prisma migrations live alongside the API code; run `npx prisma migrate dev` from `apps/api` once `DATABASE_URL` points at your target database.

### 5.4 Docker Compose option

For an API + web + Postgres demo backed by Docker:

```bash
eval "$(make sops-env-export)"   # ensures your shell has matching secrets if you need them
docker compose up --build
```

The compose file mounts the local `apps/api` and `apps/web` folders so code changes hot-reload inside the containers.

## 6. Troubleshooting and Tips

- **Missing `sops` or `jq`** – install via Homebrew (`brew install sops jq`) or your distro package manager.
- **Decrypt errors** – ensure your PGP private key is imported and available (`gpg --list-secret-keys CB3B963C0AB97B34BAF22D68F9D46501F1146F9F`).
- **Port conflicts** – override `API_PORT`, `ASTRO_PORT`, `ADMIN_PORT` before running the bootstrapper or compose stack.
- **Crawler auth failures** – verify both the API server and crawler share the same `CRAWLER_BEARER_TOKEN`.
- **LLM billing** – set only the provider keys you intend to use; the crawler tries `TEXT_IMPORT_LLM_API_KEY` first, then falls back to `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, and `GEMINI_API_KEY` in that order.

Keep `env.json` as the single source of truth, and lean on the Makefile + SOPS workflow to keep secrets synchronized across the team without leaking plaintext credentials into git.
